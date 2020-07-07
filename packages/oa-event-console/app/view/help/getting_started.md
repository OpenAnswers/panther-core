This section will guide you on how to get started on Panther. There are two main methods to import event logs, one is to use the rsyslog.conf file to import every event that is logged on the host machine or to use the API that is provided.

### rsyslog

Panther offers the option to recieve event logs directly from rsyslog, this can be achieved by downloading the rsyslog tarball on the admin page. A tutorial on how to set this up is located in the [admin section](#admin).
___
### API Key

Panther offers the option to send event logs through an API, to do this you must first generate an API key. A tutorial on how to use the API and generate an API key is in the [admin section](#admin).

### Setup a Global Rule

Global rules are rules that will be applied to every event log that is parsed in. By default you will have some syslog rules and a simple example. There is a tutorial for global rules in the [Rules](#rules) section.

### Setup a Group

Groups are used to sort the event logs based on the users discretion. There is a tutorial for groups in the [Rules](#rules) section.

### Setup a Group rule

There is a tutorial on how to setup group rules in the [Rules](#rules) section along with a working example in the [API](#api) section.