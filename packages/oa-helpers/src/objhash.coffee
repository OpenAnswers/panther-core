
# Create a hash of a simple JS object (only properties, not methods)

# createobjhash based on https://github.com/mirek/node-json-hash (MIT)
# Wasn't quite sure if it was suitable so rebuilt it. Turns out it
# was all ok
# The original could probably be included now, the tests should be
# pushed out to the project

# npm modules
crypto = require 'crypto'

# oa modules
_ = require  'lodash'



objhash = ( object )->

  # Copyright (c) <2015> <Mirek Rusin>

  # Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

  # The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

  # THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

  hash = crypto.createHash('sha1')

  none = switch

    when _.isBoolean object
      hash.update 'b'
      .update "#{object}"

    when _.isDate object
      hash.update 'd'
      .update object.toISOString()

    when _.isFunction object
      hash.update 'f'
      .update "#{object}"

    when _.isNull object
      hash.update 'n'

    when _.isUndefined object
      hash.update 'u'

    when _.isNumber object
      hash.update 'i'
      .update "#{object}"

    when _.isRegExp object
      hash.update 'x'
      .update "#{object}"

    when _.isString object
      hash.update 's'
      .update "#{object}"

    when _.isArray object
      hash.update '['
      for e in object
        hash.update 'a'
        .update objhash(e)
      hash.update ']'

    # Plain object
    else
      hash.update '{'
      # sort isn't stable, try a merge or block sort implementation
      for key in _.keys(object).sort()
        hash.update 'k'
        .update objhash(key)
        .update 'v'
        .update objhash(object[key])
      hash.update '}'

  hash.digest('hex')


module.exports = objhash
