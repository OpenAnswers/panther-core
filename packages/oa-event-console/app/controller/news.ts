//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// # News RSS

const { debug, logger } = require('oa-logging')('oa:event:controller:news');
const Promise: any = require('bluebird');
const needle = require('needle');
const FeedParser = require('feedparser');

const { TinyCache } = require('oa-tinycache');
const Errors = require('oa-errors');

class NewsRequest {
  static store: any;

  static initClass() {
    this.store = new TinyCache({ limit: 20, time: 600 });
  }

  // Request the news from http
  // https://blog.example.com/feed/
  static request(url) {
    const self = this;
    return new Promise(function (resolve, reject) {
      // Where we put the feed items
      let req;
      const items = [];
      let error_flag = false;

      const feedparser = new FeedParser();
      //feedparser.on 'error', (error)->
      //debug 'new feedparser error', error
      //reject(error)

      const opts = {
        parse: false,
        parse_response: false,
      };

      return (req = needle
        .get(url, opts, function (err, res) {
          if (err) {
            error_flag = true;
            return reject(err);
          }

          if (res.statusCode !== 200) {
            const error = new Errors.BadRequestError(`Bad status code [${res.statusCode}]`);
            error_flag = true;
            return reject(error);
          }
        })
        .on('error', function (error) {
          error_flag = true;
          return reject(error);
        })
        .on('end', function (error, response) {
          debug('end', error, response);
          if (error) {
            error_flag = true;
            return reject(error);
          }
        })
        .pipe(feedparser)

        // Proces the feedparser items
        .on('data', function (data) {
          debug('news item', data.title, data.link, data.description);
          return items.push(data);
        })
        .on('error', function (error) {
          debug('news feedparser error', error);
          if (!(error instanceof Error)) {
            error = new Error(error);
          }
          error_flag = true;
          return reject(error);
        })
        .on('finish', function () {
          debug('new finish');
          if (!error_flag) {
            self.store.set(url, items);
            return resolve(items);
          } else {
            return debug('had an error, not resolving');
          }
        }));
    });
  }

  // Fetch the news from cache, or http
  static fetch(url) {
    return new Promise(function (resolve, reject) {
      const result = NewsRequest.store.get(url);
      if (result) {
        debug('fetch returning cached entry');
        return resolve(result);
      }
      return NewsRequest.request(url)
        .then(function (result) {
          debug('newreq result');
          return resolve(result);
        })
        .catch(reject);
    });
  }

  static fetch_news() {
    return this.fetch('https://blog.example.com/feed/');
  }
}
NewsRequest.initClass();

module.exports.NewsRequest = NewsRequest;
