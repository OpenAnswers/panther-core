//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// Logging
const { debug, logger } = require('oa-logging')('oa:event:route:password');

// npm modules
const router = require('express').Router();
const moment = require('moment');

// OA modules
const Errors = require('../../lib/errors');
const config = require('../../lib/config').get_instance();
const { send_email } = require('../../lib/email');
const { _, random_string } = require('oa-helpers');

// Model
const { User } = require('../model/user');

// Validations
const { password_reset_token_schema, password_reset_schema, password_requested_schema } = require('../validations');

// ### Password reset request

// Request an email with your reset token

router.get('/', (req, res) => res.render('password', { title: 'Password' }));

router.get('/request', (req, res) => res.render('password', { title: 'Password' }));

// ### Reset requested

// Notify the user of request and present
// form for token in case they have trouble
// with the link in the email

class NoUserError extends Error {
  static initClass() {
    this.prototype.name = 'NoUser';
  }
  constructor(message) {
    super(message);
    Error.captureStackTrace(this, NoUserError);
  }
}
NoUserError.initClass();

router.post('/requested', function (req, res) {
  debug('/requested finding req.body', req.body);

  const validate_form = () =>
    new Promise(function (resolve, reject) {
      const { value, error } = password_requested_schema.validate(req.body);
      if (!error) {
        return resolve(value);
      }

      if (error instanceof Errors.ValidationError) {
        return reject(error);
      }
      return reject(new Errors.ValidationError('Invalid request'));
    });

  return validate_form()
    .then(function (validatedBody: any) {
      debug('validated, finding user', validatedBody.email);
      const email = validatedBody.email?.toLowerCase();
      return User.findOne({ email });
    })
    .then(function (user) {
      debug('query got user', user);
      if (!user) {
        // This is not a known email address, so log the attempt
        throw new NoUserError(`${req.body.email}`);
      }
      user.generate_token();
      return user.save();
    })
    .then(function (user) {
      debug('User saved', user);
      logger.info('Password resetting started for user id [%s]', user.id);
      const reset_url = `${config.app.url}/password/reset/${user.reset.token}`;
      return send_email({
        to: user.email,
        from: config.app.email,
        subject: `${config.app.name} password reset requested`,
        template: {
          name: 'password-reset-requested',
          values: {
            token: user.reset.token,
            reset_url,
          },
        },
      });
    })
    .then(function (email_info) {
      debug('Sent email', email_info);
      logger.info(
        'Requesting password reset sent email msgid [%s], response [%s]',
        email_info.messageId,
        email_info.response
      );
      return res.render('password-requested', { title: 'Password' });
    })
    .catch(function (error) {
      debug('Error', error);

      if (error instanceof Errors.ValidationError) {
        logger.error(`A user requested an invalid password reset [${error}] [${req.body.email}]`);
        return res.render('password', {
          title: 'Password',
          error: 'Email invalid',
        });
      } else if (error instanceof NoUserError) {
        logger.error(`A user requested a password reset for an email that doesn't exist [${error}] ${req.body.email}]`);
        return res.render('password-requested', { title: 'Password' });
      } else {
        logger.error('/requested', error, error.stack, req.body.email);
        return res.render('password', {
          title: 'Password',
          error: `Request failed: ${error}`,
        });
      }
    });
});
//throw error

router.param('token', function (req, res, next, token) {
  debug('password token param found on request', token, req.url, req.originalUrl);
  return next();
});

// ### Password reset form

// Provide the password reset form when a valid token is supplied

router.get('/reset/:token', function (req, res) {
  debug('/reset/:token looking for req.params.token', req.params.token);

  const validation = password_reset_token_schema.validate(req.params.token);
  if (validation.error) {
    if (validation.error instanceof Errors.ValidationError) {
      logger.error('validation failed ', validation.error.message);
    }
    return res.render('password-requested', {
      title: 'Password Token',
      messages: {
        error: 'Invalid token',
      },
    });
  }

  const validatedData = validation.value;

  debug('validatedData: ', validatedData);
  return User.findOne({ 'reset.token': validatedData })
    .then(function (user) {
      if (!user) {
        res.render('password-requested', {
          title: 'Password Token',
          messages: {
            error: 'Token not found, try again',
          },
        });
        throw new Errors.ValidationError('Token not found, try again');
      }

      logger.warn('Attempting password reset for user id [%s]', user.id);
      return res.render('password-reset', {
        title: 'Password Reset',
        token: user.reset.token,
      });
    })
    .catch(Errors.ValidationError, error => logger.error(error, error.stack))
    .catch(function (error) {
      logger.error(error, error.stack);
      res.render('error', {
        messages: {
          error: 'Unknown error',
        },
      });
      throw error;
    });
});

// ### Password reset action

// This does the actual reset of the password

router.post('/reset', function (req, res) {
  let { value, error } = password_reset_token_schema.validate(req.body.token);

  debug('value, %o, error %o', value, error);

  if (error) {
    logger.error('Attempted to reset password with an invalid reset token [%s]', req.body.token);
    return res.render('password-requested', {
      title: 'Password Token',
      messages: {
        error: `Invalid token [${req.body.token}], try again`,
      },
    });
  }

  ({ value, error } = password_reset_schema.validate(req.body));
  if (error) {
    logger.info('Password reset request schema incomplete');
    // Likely the first pass at resetting password when just providing the token
    if (error instanceof Errors.ValidationError) {
      return res.render('password-reset', {
        title: 'Password Reset',
        token: value.token,
        messages: {
          error: error.message,
        },
      });
    } else {
      return res.render('password-reset', {
        title: 'Password Reset',
        token: value.token,
      });
    }
  }

  return User.findOne({ 'reset.token': value.token })
    .then(function (user) {
      if (!user) {
        logger.warn('Password reset token did not exist [%s]', value.token);
        res.render('password-requested', {
          title: 'Password Token',
          messages: {
            error: 'Token not found',
          },
        });
        throw new Errors.ValidationError('Invalid token, try again');
      }

      return user.setPassword(value.password);
    })
    .then(function (user) {
      // expire the token
      user.reset = { expires: moment().toDate() };
      return user.save();
    })
    .then(function (user) {
      logger.info('Password has been reset for user id [%s]', user.id);
      debug('user after save', user);
      return send_email({
        from: config.app.email,
        to: user.email,
        subject: `${config.app.name} password reset`,
        text: 'Your password has been reset',
        template: {
          name: 'password-reset',
        },
      });
    })
    .then(info =>
      res.render('password-reset-success', {
        title: 'Password reset successful',
        messages: {
          success: 'Your password has been reset',
        },
      })
    )
    .catch(Errors.BadRequestError, Errors.ValidationError, function (error) {
      logger.error(error, error.stack);
      return res.render('password-reset', {
        title: 'Password Reset',
        messages: {
          error: error.message,
        },
      });
    })
    .catch(function (error) {
      logger.error(error, error.stack);
      res.render('error', {
        messages: {
          error: 'Unknown error',
        },
      });
      throw error;
    });
});

module.exports = router;
