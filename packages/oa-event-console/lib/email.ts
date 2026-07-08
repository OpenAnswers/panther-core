
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// ## Email

// This is where all the custom errors live.

// We also hold a generic error thrower that does things the way the
// app expects.

// Logging module
const { logger, debug } = require('oa-logging')('oa:event:email');

// npm modules
const Promise: any      = require('bluebird');
const nodemailer        = require('nodemailer');
const pug               = require('pug');
const _                 = require('lodash');

// node modules
const fs                = Promise.promisifyAll(require('fs'));

// oa modules
const Errors            = require('./errors');
const config            = require('./config').get_instance();


// Setup this transport, this might need to modify based on "NODE_ENV" and maybe
// use `config`


// transport = nodemailer.createTransport
//   service: 'Gmail'
//   auth:
//     user: 'gmail.user@gmail.com'
//     pass: 'userpass'

const transport_options = config.smtp.jsonTransport
  ? { jsonTransport: true }
  : {
      secure: config.smtp.secure ?? false,
      ignoreTLS: config.smtp.ignoreTLS ?? true,
      port: config.smtp.port || 25,
      host: config.smtp.host || 'localhost'
    };

debug("transport options", transport_options);

const transport = Promise.promisifyAll(nodemailer.createTransport( transport_options ));


// Cache for any compiled templates we pick up along the way
// key = filename
// value = fn
const compiled_templates = {};


// ### check_templates( template_info )

// Builds a html template
// Should support text as well but found it difficult to build
// The "if text file exists, build it" flow with promises

// `template.name`:  Name of the template to lookup, without the .pug
// `template.values`: Values to pass into template rendering

const build_template = function( template ){

  let resolve;
  if (template.values == null) { template.values = {}; }
  if (template.values.url == null) { template.values.url = config.app.url; }
  if (template.values.support_url == null) { template.values.support_url = config.app.support_url; }

  const html_file = config.path.join(config.path.emails, `${template.name}.pug`);
  //text_file = config.path.join config.path.emails, "#{template.name}.text.pug"

  if (!compiled_templates[html_file]) {
    compiled_templates[html_file] = pug.compileFile(html_file);
  }

  return resolve = compiled_templates[html_file](template.values);
};


// ### send_email( options )
// Returns a promise to send email via nodemailer
// Adds in some extra log handling to an email

// `email_options`: from nodemailer
// `email_options.template:` Render a pug template for html content

const send_email_Async = email_options => new Promise(function( resolve, reject ){
  debug('send_email email_options', email_options);

  if (!email_options || !_.isObject(email_options)) {
    return reject('Requires an email_options object');
  }

  // Log some stuff
  debug('sending email', email_options);
  logger.debug('Sending email from [%s] to [%s] subject [%s]',
    email_options.from, email_options.to, email_options.subject);

  // Default the `from:` to the app
  if (email_options.from == null) { email_options.from = config.app.email; }

  // Build a html template
  // Think about adding text too
  if (email_options.template != null) {
    email_options.html = build_template(email_options.template);
    debug('send_email added html form template', email_options.html);
  }

  // Validate the email before relying on the smtp server
  if (email_options.subject == null) {
    return reject(new Errors.ValidationError("Couldn't send an email without [subject:]"));
  }

  if (email_options.to == null) {
    return reject(new Errors.ValidationError("Couldn't send an email without [to:]"));
  }

  if ((email_options.text == null) && (email_options.html == null)) {
    return reject(new Errors.ValidationError("Couldn't send an email without text or html content"));
  }

  // Now send the email, with out logging/debug
  return transport.sendMailAsync(email_options)
  .then(function( info ){
    logger.info('Email sent from [%s] to [%s] subject [%s] info [%s]',
      email_options.from, email_options.to, email_options.subject, info.response);
    debug('sent email', email_options, info);
    return resolve(info);}).catch(function( error ){
    logger.error('Problem sending email from [%s] to [%s] subject [%s] error [%s]',
      email_options.from, email_options.to, email_options.subject, error, error.stack);
    return reject(error);
  });
});


// Exports
module.exports = {
  nodemailer,
  transport,
  send_email:     send_email_Async,
  send_email_Async,
  sendMailAsync:  transport.sendMailAsync
};
