# 
# Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  

# # News RSS

{debug, logger} = require('oa-logging')('oa:event:controller:news')
Promise     = require 'bluebird'
needle      = require 'needle'
FeedParser  = require 'feedparser'

{ TinyCache } = require 'oa-tinycache'
Errors      = require 'oa-errors'



class NewsRequest

  @store = new TinyCache(limit: 20, time: 600)

  # Request the news from http
  # https://openanswersblog.wordpress.com/feed/
  @request: ( url )->
    self = @
    new Promise ( resolve, reject )->
      
      # Where we put the feed items
      items = []
      error_flag = false

      feedparser = new FeedParser()
      #feedparser.on 'error', (error)->
        #debug 'new feedparser error', error
        #reject(error)
      
      opts =
        parse: false
        parse_response: false
      
      req = needle.get url, opts, (err, res)->
        if err
          error_flag = true
          return reject(err)

        if res.statusCode isnt 200
          error = new Errors.BadRequestError "Bad status code [#{res.statusCode}]"
          error_flag = true
          return reject(error)

      .on 'error', ->
        error_flag = true
        reject(error)

      .on 'end', ( error, response )->
        debug 'end', error, response
        if error 
          error_flag = true
          reject(error)
      
      .pipe(feedparser)

      # Proces the feedparser items
      .on 'data', (data)->
        debug 'news item', data.title, data.link, data.description
        items.push data
      
      .on 'error', (error)->
        debug 'news feedparser error', error
        unless error instanceof Error
          error = new Error(error)
        error_flag = true
        reject(error)
      
      .on 'finish', ->
        debug 'new finish'
        unless error_flag
          self.store.set url, items
          resolve(items)
        else
          debug 'had an error, not resolving'

  # Fetch the news from cache, or http
  @fetch: ( url )->
    new Promise ( resolve, reject )->
      result = NewsRequest.store.get url
      if result
        debug 'fetch returning cached entry'
        return resolve(result)
      NewsRequest.request(url)
      .then (result)->
        debug 'newreq result'
        resolve( result )
      .catch reject

  @fetch_news: ()->
    @fetch 'https://openanswersblog.wordpress.com/feed/'


module.exports.NewsRequest = NewsRequest
