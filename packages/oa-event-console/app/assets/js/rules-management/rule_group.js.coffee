
# An instance of a Rule
# Many make up a RuleSet

class GroupRule extends Rule

  constructor: ( index, options )->
    super index, options
    @index = index
    @group = options.group
    @dom_id = ".card-global-rule[data-id=#{@index}][data-group=#{@group}]"

