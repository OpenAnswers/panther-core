Event Rules 
===========

`oa-event-rules` houses the Rules model for the event system.


The console, server and monitors all rely on this module

## Classes

    Agent
      AgentHttp
      AgentSyslog
      AgentGraylog
    Event
    EventRules
      RuleSet
        Rule
          Select
          Action
          Option
      Groups
        Group
          Select
          RuleSet
            Rule
              Select
              Action
              Option
      Globals
        RuleSet
          Rule
            Select
            Action
            Option

### Event/Alert model

Although the Event/Alert database model is not defined here, `Event` is closely tied to them. The `Alert` and `AlertOccurrences` models should probably be moved into here so multiple apps can access it rather than just _event_server_.

## Tests

Tests can be run with `npm run test`. This will run both unit and functional tests. 

### Unit

Each class should have a matching unit test spec in `test/unit`.
As you progress to the root of the EventRules class heirarchy the test become less and less unitish as there is not a lot of mocking of classes. This means test order can help pick up issues more quickly. Select, Action and Option are named to run first (mocha includes via glob matching).

### Functional

The functional tests deal with EventRules and loading/saving. They also test the git integration
