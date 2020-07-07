


class Transforms

  @available_transforms:

    to_lower_case:
      function: ( str )->
        "#{str}".toLowerCase()
      name: "Lowercase"
      help: "Convert to all lower case"

    to_upper_case:
      function: ( str )->
        "#{str}".toUpperCase()
      name: "Uppercase"
      help: "Convert to all upper case"

    left_trim:
      function: ( str )->
        "#{str}".replace /^\s+/, ''
      name: "Left trim"
      help: "Remove leading whitespsace"
    
    right_trim:
      function: ( str )->
        "#{str}".replace /\s+$/m, ''
      name: "Right trim"
      help: "Remove trailing whitspace, including new lines"

    trim:
      function: ( str )->
        "#{str}".replace(/^\s+/, '').replace(/\s+$/m, '')
      name: "Trim whitespace"
      help: "Trim leading and trailing whitespace"


module.exports =
  Transforms: Transforms
