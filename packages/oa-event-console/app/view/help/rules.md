
Rules are how the syslog messages are turned into console events. Rules are where you can discard, deduplicate or modify the events that appear in you console automatically.

Firstly there is a set of Syslog Mappings that are applied to every event.

Then Global Rules are processed, one by one.

Then an event can be optionally sorted into a single *Group* and that Groups Rules are processed, one by one.

### Syslog Mappings   <a class="anchor" name="rules-syslog_mappings"></a>

All events need to be mapped from their syslog form to an event in the console.

#### Levels to Severities      <a class="anchor" name="rules-levels_to_severities"></a>

Syslog logging levels need to be mapped to event console severeties as they are not a one to one relationship. The scale is also inverted.

Syslog levels are from 7 (Debug) to 0 (Emergency).

Event console severities are from 0 (Clear) to 5 (Critical).

Events that are clear will be removed from the list of event logs in the console.

#### Field Mappings    <a class="anchor" name="rules-field_mappings"></a>

Syslog fields need to be mapped to event console fields. These fields will then be available to match against in rules processing.

Please note that when events are deduplicated via the #[code identifier] field, you may lose this information. For example the pid of a process can change regularly but is not included in the identifier by default, so you can have multiple pids that aggregate into the one event.

#### Event Identifier    <a class="anchor" name="rules-event_identifier"></a>

The #[code identifier] field is what decides if an event is unique in the console.

The default setting is to combine the node, severity and summary fields: #[code {node}:{severity}:{summary}].

Any events with a matching identifier will be grouped together and that events #[code tally] will increase by 1. If no matching event identifier is found, a new event is created.

#### Transforms        <a class="anchor" name="rules-transforms"></a>

The transforms allow you to apply a pre defined function to an event console field before rules processing takes place.

Currently #[code lower_case] is the only transform supported and by default it is applied to the "node" field so you don't need to worry about case in when checking the node field.

If you have an idea for a transform you would like added, please let us know.
___
### Global Rules   <a class="anchor" name="rules-global"></a>

A Global rule is a rule that is applied to every event that is parsed into Panther. These are common rules that will apply to most if not every group.

An exmaple of this would be a global rule to discard any events that are parsed in due to the registry file being in use by another application or service.

To do this you must:

1.) Create a new rule
<img src="/help/CreateGlobalRule7.png" alt="Creating a new global rule" class="helpimg" >

2.) Enter a name for the rule and choose a selector from the drop down menu, in this case we are going to use 'Match' to check for a string in the summary of the event.
<br  />

<br  />
<img src="/help/CreateGlobalRule4.png" alt="Creating a new global rule" class="helpimg" >

3.) Select a field, in this case it will be the summary field of the log event.

4.) Type the String you want to match with in the summary, in this case the message that we will be looking for is '/detected your registry file is still in use by other applications or services/'.

4.) The action we want to select discard to delete the event log from the console.
<br  />

<br  />

<img src="/help/CreateGlobalRule6.png" alt="Creating a new global rule" class="helpimg" >

<br  />
5.) Lastly save the new rule, once the rule is saved you must click deploy to deploy the changes to the server.

<img src="/help/CreateGlobalRule9.png" alt="Creating a new global rule" class="helpimg" >

### Groups Rules   <a class="anchor" name="rules-group"></a>

A group rule is used to sort the event logs into different groups based on the users discretion.

An exmaple of this would be splitting the events based on the service e.g web service and OS. The web service group would handle events related to apache for example such as downtime and the OS group would want to handle events like OS crashes. Sorting the event logs into groups like this will maximise efficiency by letting the relavent teams deal with them.

To create a new group rule:

1.) Create a new group
<br  />
<br  />

<img src="/help/CreateGroupRule1.png" alt="Creating a new group rule" class="helpimg" >

<br  />

2.) Here type the name of the group you want to make, in this case we created two groups one named Operating System and one named Apache Web Service.
<br  />
<br  />

<img src="/help/CreateGroupRule2.png" alt="Creating a new group rule" class="helpimg" >

<br />

3.) To match any event log with this group we are going to set a rule in the group selector. The rule is going to check the tag of the event log for the word "os", once this match has been found it will run through the rules in the group one by one against the event log entry and execute any processes it needs to.

<br  />
To do this click on the pencil to open up the group selector.

<br  />

<img src="/help/GroupSelector.png" alt="Creating a new group rule" class="helpimg" >

<br  />

4.) Now create a rule to match the tag field with the word "os" and save it.
<br  />
<br  />

<img src="/help/tagos.png" alt="Creating a new group rule" class="helpimg" >

<br  />

5.) We now have a group selector that will match event logs against any rules in this group if it contains the "os" tag. To create a new rule for the group, it is similar to creating a global rule. Click on the down arrow for the group you wish to create a rule for and select 'Create a rule for...'
<br  />
<br  />

<img src="/help/CreateGroupRule33.png" alt="Creating a new group rule" class="helpimg" >

<br />

6.) This section is also very similar to the global rule section as you are just creating a rule. In the example we are creating a rule to log and group any failed su authentication events.
<br  />
<br  />

<img src="/help/CreateGroupRule444.png" alt="Creating a new group rule" class="helpimg" >

This rule is setting any event log that contains the String "FAILED su for .*" to be added to the Operating System group and the severity set to 3.

<br />
<br />

7.) Similar to creating a global rule, click save and enable the delopyment to the server.
<br />
<br />

<img src="/help/CreateGroupRule5.png" alt="Creating a new group rule" class="helpimg" >

An example of this group rule in action is displayed in the [API](#api) section.