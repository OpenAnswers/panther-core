//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// Route Api Key - /api/apikey/

// Logging module
const { logger, debug } = require('oa-logging')('oa:event:route:api:apikey');

// npm modules
const bodyParser = require('body-parser');

// OA modules
const Errors = require('oa-errors');
const config = require('../../../lib/config').get_instance();
const { Mongoose } = require('../../../lib/mongoose');
const { _ } = require('oa-helpers');

// Model
const { ApiKey } = require('../../model/apikey');

const router = require('express').Router();

router.use(bodyParser.json());

/**
 * @swagger
 *
 * definitions:
 *   Error:
 *     type: object
 *     properties:
 *       name:
 *         type: string
 *         enum:
 *           - error
 *       message:
 *         type: string
 *     example:
 *       name: error
 *       message: Unauthorised
 *   ApiKey:
 *     type: string
 *     pattern: '^[a-zA-Z0-9]+$'
 *   ApiKeyRecord:
 *     type: object
 *     properties:
 *       _id:
 *         type: string
 *         pattern: '[a-zA-Z0-9]+'
 *       username:
 *         type: string
 *       __v:
 *         type: number
 *       created:
 *         type: string
 *         format: date-time
 *       apikey:
 *         $ref: '#/definitions/ApiKey'
 *     required:
 *       - _id
 *       - username
 *       - apikey
 * responses:
 *   Unauthorised:
 *     description: Unauthorised
 *     content:
 *       application/json:
 *         schema:
 *           $ref: '#/definitions/Error'
 */
//Deal with an apikey id param
router.param('apikey', function (req, res, next, apikey) {
  debug('found a param apikey', apikey);
  req.apikey = apikey;
  return next();
});

/**
 * @todo restrict access to internal components
 * @description validates the existance of an API key
 * @swagger
 * /apikey/exists/{apiKey}:
 *   get:
 *     summary: Checks for the existence of an API key
 *     parameters:
 *       - name: apiKey
 *         in: path
 *         required: true
 *         schema:
 *           $ref: '#/definitions/ApiKey'
 *     responses:
 *       "200":
 *         content:
 *           "application/json":
 *             schema:
 *               type: object
 *               properties:
 *                 found:
 *                   type: boolean
 */
router.get('/exists/:apikey', (req, res, next) =>
  ApiKey.findOne({ apikey: req.apikey })
    .then(function (doc) {
      if (!doc) {
        return res.json({ found: false });
      } else {
        return res.json({ found: true });
      }
    })
    .catch(function (err) {
      logger.error(err);
      return next(err);
    })
);

/**
 * @description restrict access to admin
 */
router.use(function (req, res, next) {
  if (req.user && req.user.group && req.user.group === 'admin') {
    return next();
  } else {
    logger.error('Client tried to API without auth session', req.sessionID);
    res.status(401);
    return res.json({
      name: 'error',
      message: 'Not Permitted',
    });
  }
});

/**
 * @swagger
 * /apikey/read:
 *   get:
 *     summary: List of API keys
 *     responses:
 *       "200":
 *         content:
 *           "application/json":
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: integer
 *                   minimum: 0
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/definitions/ApiKeyRecord'
 *       401:
 *         $ref: '#/responses/Unauthorised'
 */
router.get('/read', (req, res, next) =>
  ApiKey.find()
    .then(docs =>
      res.json({
        results: docs.length,
        data: docs,
      })
    )
    .catch(function (err) {
      logger.error(err);
      return next(err);
    })
);

/**
 * @swagger
 * /apikey/read/{apiKey}:
 *   get:
 *     summary: view and API key
 *     parameters:
 *       - name: apiKey
 *         in: path
 *         required: true
 *         schema:
 *           $ref: '#/definitions/ApiKey'
 *     responses:
 *       "200":
 *         content:
 *           "application/json":
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: integer
 *                   minimum: 1
 *                   maximum: 1
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/definitions/ApiKeyRecord'
 *       401:
 *         $ref: '#/responses/Unauthorised'
 *       404:
 *         $ref: '#/responses/NotFound'
 */

router.get('/read/:apikey', (req, res, next) =>
  ApiKey.findOne({ apikey: req.apikey })
    .then(function (doc) {
      if (!doc) {
        return next(new Errors.HttpError404());
      } else {
        return res.json({
          results: 1,
          data: [doc],
        });
      }
    })

    .catch(function (err) {
      logger.error(err);
      return next(err);
    })
);

/**
 * @swagger
 * /apikey/delete/{apiKey}:
 *   delete:
 *     summary: remove an API key
 *     parameters:
 *       - name: apiKey
 *         in: path
 *         required: true
 *         schema:
 *           $ref: '#/definitions/ApiKey'
 *     responses:
 *       "200":
 *         content:
 *           "application/json":
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         $ref: '#/responses/Unauthorised'
 *       404:
 *         $ref: '#/responses/NotFound'
 */

router.delete('/delete/:apikey', function (req, res, next) {
  logger.debug('removing apikey', req.apikey);
  return ApiKey.deleteOne({ apikey: req.apikey })
    .then(function (doc) {
      debug('remove doc result', doc);
      if (!doc) {
        throw new Errors.HttpError404();
      }

      if (doc.deletedCount !== 1) {
        throw new Errors.HttpError404();
      }

      logger.info('apikey removed', req.apikey);
      return res.json({ result: doc, message: 'deleted' });
    })

    .catch(function (err) {
      debug('remove error', err);
      return next(err);
    });
});

router.use(function (error, req, res, next) {
  const code = error.code ? error.code : 500;
  if (error.code === 500) {
    logger.error(error.message, error.stack);
  }
  return res.status(code).json({ message: error.message });
});

module.exports = router;
