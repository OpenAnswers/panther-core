API Console is used to setup sending in event logs through the means of http.

#### API Key

The API key section has a dropdown list that contains the current API keys that can be used to send in event logs.

#### Node

The node is the host name that will be applied to the event log

#### Tag

The tag is used as meta data to identify and distinguish between different applications

#### Summary

The Summary contains the message body of the event log, it describes the event that took place. It will give information such as the error messageor which application caused the message to be sent. It can also contain specific pieces of data about the event such as the number of retries a failed login attempt was made.

#### Severity

The Severity is the indicator as to how important the event log is, this can range from 0 being clear and 5 being an emergency.

### Sending An Event

Once all of these variables are set the event log can be sent.

___

### Response

Once an event log is sent the server sends a response back. Depending on what was sent the user could either recieve an error message or a confirmation message.

### URL

The URL is used if the user wants to use their own method of sending an event log over http.

### Body

The body contains the entire event log which includes the node, tag, summary and severity. It is used to display to the user what is going to be sent to Panther.

### cURL

There is also an option of sending the event log to Panther using a cURL command. Once the user has set the required variables a cURL script is generated in real time to that can be used to send the event log.
___
### Example

An example of sending an event log using the GUI on the API page, this example will also display how the group rule that we created above works. The rule we created was to group any event logs that had a failed su login attempt into the Operating System group.

1.) First select the create event check box and an API key that you would like to use from the drop down menu.

<br  />
<img src="/help/apistep1.png" alt="Creating a new event log" class="helpimg" >
<br  />

2.) Now to create an event that is handled by the Operating System group that we created the tag for the event needs to be "os" and the summary has to include "FAILED su for". The node name can be anything along with the severity level because we set a custom one with the rule that was created.

<br  />
<img src="/help/apistep2.png" alt="Creating a new event log" class="helpimg" >
<br  />

You will notice that the body and cURL sections will be changing in real-time in response to the variables that were set.

<br  />
<img src="/help/apistep3.png" alt="Creating a new event log" class="helpimg" >
<br  />

3.) Once you have set the variables and clicked send, the response section will update with a message in regards to what happened. The response message will let you know if you have been successful or if there has been a problem.

<br  />
<img src="/help/apistep4.png" alt="Creating a new event log" class="helpimg" >
<br  />

4.) Now the entry should be in the console that displays all the event logs.

<br  />
<img src="/help/apistep5.png" alt="Creating a new event log" class="helpimg" >

<br  />

As you can see the entry is yellow which is also another indicator that the severity was set to 3. The group was also set as Operating System, this indicates that the rule that was created earlier has been applied to this event log.
