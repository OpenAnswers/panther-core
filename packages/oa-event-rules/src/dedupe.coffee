# 
# Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  


# # Dedupe

# A common task of deduplication has been added which will
# generate rules for you

# logging
{ logger, debug } = require('oa-logging')('oa:event:rules:dedupe')

# npm modules
yaml = require 'js-yaml'

# oa modules
{ Rule }    = require './rule'
{ throw_error,_ } = require 'oa-helpers'


# Grouping of rules that are for dedupe
class @Dedupe

  @generate: (yaml_def) ->
  
    rules = []
    for dedupe_def in yaml_def
      rules.push @gen_dedupe_rule dedupe_def

    rules


  # Generate a summary dedupe rule
  @gen_dedupe_rule: ( match_replace ) ->

    debug 'generate dedupe rulematch_replace', match_replace
    switch match_replace.length
      when 3
        [ match, search, repl ] = match_replace
      when 2
        [ match, repl ] = match_replace
        search = match
      else
        throw_error "nope", match_replace.length, match_replace

    Rule.generate
      name: "dedupe #{match} #{search} #{repl}"
      match:
        summary: match
      replace:
        field: 'summary'
        this:  search
        with:  repl
