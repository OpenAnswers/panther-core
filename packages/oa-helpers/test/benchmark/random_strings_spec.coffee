#
# Copyright (C) 2015, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.  
# This file is subject to the terms and conditions defined in the Software License Agreement.
# 


{
  random_string,
  crypto_random_hex
  crypto_random_base64
  crypto_random_base62_string,
  crypto_random_base62_string_async,
} = require('../../src/helpers')

crypto = require 'crypto'

console.log 'random %s', random_string(8)

console.log 'crypto %s', crypto_random_base62_string(8)

crypto_random_base62_string_async(8).then (str)-> console.log 'async  %s', str

Benchmark = require 'benchmark'
suite = new Benchmark.Suite
 
# add tests
suite.add 'crypto_random_base62(32)', ()->
  c = crypto_random_base62_string(32)

# add tests
suite.add 'crypto_random_hex(32)', ()->
  c = crypto_random_hex(32)

# add tests
suite.add 'crypto_random_base64(32)', ()->
  c = crypto_random_base64(32)

.add 'random_string(32)', ()->
  b = random_string(32)

.add 'crypto.randomBytes(32)', ()->
  buf = crypto.randomBytes(32).toString('base64')

# add listeners
.on 'cycle', (event)->
  console.log(String(event.target))

.on 'complete', ()->
  console.log 'Fastest is ' + this.filter('fastest').map('name')

# run async
.run 'async': true




# length = 4
# min = 128
# while true
#   a = crypto.randomBytes(length).toString('base64').replace(/\+|\//g, '')
#   if a.length < min then min=a.length; console.log(min)