# Panther Event Monitors

Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
All rights reserved.

## Monitors

- syslogd
- http
- heartbeat_xmld
- graylog

## Monitor Rules

Each monitor has an associated rules file which is responsible for mapping the
token/value pairs from the event source to event fields. Event fields are
analagous to columns on a database row.

The rules file is a yaml definition made up of a number of rules.
Rules contain a defintion of which events to Select.
Then a defintion of an Action to take on those selected events.

## Pattern matching

A key part of any rules file is performing pattern matching against the event via the `match` action and using a string surrounded with forward slashes to indicate a regular express: `/pattern/`. For the syslogd monitor a large portion of the useful information pertaining to an alert is contained in the message attribute.

## Quick Start

`node bin/oamon.js --name http`
