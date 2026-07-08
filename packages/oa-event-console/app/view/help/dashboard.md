The dashboard provides an overview of the current contents of your event console.

### Severities

At the top of the dashboard there is a counter for the severities of the event logs that have been processed. This counter increases with the number of unique event logs, therefore if the same event log is processed multiple times this counter will not increase.

### Event Groups

The event groups section lists all the groups that have been created and displays a counter for the number of unique event log enteries in those groups. It also contains two other entries, a counter for all events and one for no groups.

### Activity Stream

The activity stream on the dashboard keeps track of the users interaction with Panther. It logs events along with the time and the user that was responsible for the action. The activity stream logs:

* When an event log is acknowledged or unacknowledged
* Event assignments
* Severity changes
* Clearing an event
* Deleting an event

### Inventory

Inventory keeps a log of the hostnames that have connected to Panther and the last time they connected.