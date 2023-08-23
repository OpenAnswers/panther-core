![Panther Logo](/packages/oa-event-console/public/panther_logo_border.png)

Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
All rights reserved.
# Description

Panther is an event consolidation and management application that centralizes and manages events from IT systems, networks and applications in a single console. Support and Operations teams benefit from increased efficiency and speed to problem resolution by being able to quickly and easily identify the monitoring events that are most important.

Use the Panther Console and Rules to filter, acknowledge, group, enrich, de-duplicate, aggregate, categorize, assign ownership and manage events through an (ITSM) Event Management lifecycle. Events can be securely sourced and processed from any Syslog source and/or via the Panther API.

_Watch your Events like a Panther!_

## Table of Contents

- [Description](#description)
  - [Table of Contents](#table-of-contents)
- [Documentation](#documentation)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
    - [Software versions](#software-versions)
    - [Disk space](#disk-space)
  - [Pre-built Docker images](#pre-built-docker-images)
  - [Start the containers](#start-the-containers)
- [Logging in](#logging-in)
  - [Creating additional users](#creating-additional-users)
- [Sending events to Panther](#sending-events-to-panther)
  - [Sending events with logger (syslog command line)](#sending-events-with-logger-syslog-command-line)
  - [Forwarding events from syslogd (pre-built configs)](#forwarding-events-from-syslogd-pre-built-configs)
  - [Sending events with the HTTP API](#sending-events-with-the-http-api)
- [Panther rules](#panther-rules)
- [Contributing](#contributing)
- [Versioning](#versioning)
- [License](#license)
- [Authors](#authors)
- [Acknowledgements](#acknowledgements)

# Documentation


Panther's user documentation is available at [**openanswers.github.io/panther-docs**](https://openanswers.github.io/panther-docs/#/).


# Getting Started

There are several ways to get up and running with Panther, this guide will focus on using the prebuilt Docker images available at [docker.com/r/openanswers](https://hub.docker.com/r/openanswers).

Optionally you can build the code yourself by following the instructions for:

- Locally building [docker images](/README.docker.md)
- Build from [the source](/README.build.md) from a [GitHub/OpenAnswers/panther-core](https://github.com/OpenAnswers/panther-core) checkout.


## Prerequisites

---

### Software versions

You will need the following minimum software versions

- [Docker](https://docs.docker.com/engine/install/) 19.03
- [docker-compose](https://docs.docker.com/compose/install/) 1.26

### Disk space

The Docker images will require approximately 1GB of space.  The MongoDB size will depend upon how many events are stored, typically it will be multi gigbytes. 

## Pre-built Docker images

---

Panther is comprised of several container images that can be started using the [`docker-compose.yml`](/docker-compose.yml) file below. 

To change the initial username/password credentials modify the following environment variables:
 - `ADMIN_USERNAME=admin`
 - `ADMIN_PASSWORD=admin`
 - `ADMIN_EMAIL=you@example.com`

```
version: '3'
services:
  mongodb:
    image: mongo:3.6.23
    container_name: mongo
    hostname: mongodb
    restart: unless-stopped
    environment:
      - TZ=Europe/London
    expose:
      - '27017'

  event-console:
    image: openanswers/panther-console:4
    container_name: event-console
    hostname: console
    restart: unless-stopped
    environment:
      - ADMIN_USERNAME=admin
      - ADMIN_PASSWORD=admin
      - ADMIN_EMAIL=you@example.com
    depends_on:
      - mongodb
    expose:
      - 3001
    ports:
      - 3001:3001
    links:
      - mongodb
    volumes:
      - rules-vol:/app/rules:rw

  event-server:
    image: openanswers/panther-server:4
    container_name: event-server
    hostname: server
    restart: unless-stopped
    expose:
      - 4002
    depends_on:
      - mongodb
    links:
      - mongodb
    volumes:
      - rules-vol:/app/rules:ro

  event-monitors-http:
    image: openanswers/panther-monitors:4
    container_name: event-monitors-http
    hostname: event-monitors-http
    restart: unless-stopped
    ports:
      - '5001:5001'
    command: http
    depends_on:
      - event-console
      - event-server
    volumes:
      - rules-vol:/app/rules:ro

  event-monitors-syslogd:
    image: openanswers/panther-monitors:4
    container_name: event-monitors-syslogd
    hostname: event-monitors-syslogd
    restart: unless-stopped
    ports:
      - '1514:1514'
    command: syslogd
    depends_on:
      - event-console
      - event-server
    volumes:
      - rules-vol:/app/rules:ro

volumes:
  rules-vol:
```

## Start the containers

---

With the above file saved locally as `docker-compose.yml`, Panther is started with

```bash
docker-compose up -d
```
This will expose:
 - The main web interface on port `3001`
 - A syslog receiver on `1514` 
 - http event submission on `5001`

# Logging in

Panther should now be running locally and can be accessed through the web interface at [localhost:3001](http://localhost:3001).

## Creating additional users

---

- Web admin intreface

  Users can be added from the admin interface at [localhost:3001/admin](localhost:3001/admin) 

  Please consult the documentation for more information at [**Panther admin documentation**](https://openanswers.github.io/panther-docs/#/admin/README?id=user-administration)

- Command line

  From the command line with:

  ```
  docker-compose exec event-console node bin/setup_user.js -u <USERNAME> -p <PASSWORD> -e <EMAIL-ADDRESS>
  ```


# Sending events to Panther

With the pre-built images there are two ways to send events to Panther, *Syslog* and *HTTP*.

For more information please see [**Panther API documentation**](https://openanswers.github.io/panther-docs/#/api/README?id=sending-an-event)

## Sending events with logger (syslog command line)

---

The Panther syslogd monitor will be listening by default on `localhost:1514` to send a test message use the following:

```bash
logger -T -n localhost -P 1514 "Hello from the command line"
```

**NOTE**: Fowarded messages must be sent via the TCP transport, and not UDP.

## Forwarding events from syslogd (pre-built configs)

---

Sample config files for the following can be downloaded from the Panther admin [localhost:3001/admin](http://localhost:3001/admin) page.

- [rsyslog](https://rsyslog.com) 
- [NXLog](https://nxlog.co) (Linux and Windows)

**NOTE**: You will need to change `localhost` as the destination hostname in these files if sending events over the network. 

## Sending events with the HTTP API

---

HTTP event submission requires an API key, one will have been created when the containers were brought up.  

You can create more by following the [**Panther API Documentation**](https://openanswers.github.io/panther-docs/#/admin/README?id=api-keys). 

You can view your API Keys at [localhost:3001/admin](http://localhost:3001/admin)


With an API key you can send an event using curl with:
```bash
curl -X POST -H 'X-Api-Token: <YOUR-API-KEY>' -H 'Content-Type: application/json' -d '{"event":{"node":"myhostname","tag":"event-tag","summary":"Hello from http","severity":1}}' 'http://localhost:5001/api/event/create'
```

# Panther rules

This is the logic behind how Panther interprets and categorizes incoming events from HTTP and Syslogd event sources. For example setting the severity of an event depending on some string existing in the event body.

The rule files are stored in a `docker volume` `rules_vol:/server.rules.yml`.  The precise name will depend on the directory Panther was started from.  

To find the exact name:
```bash
docker volume ls | grep rules-vol
```

There are two rule files that can be modified

- Global Rules [localhost:3001/rules/globals](http://localhost:3001/rules/globals)
- Group Rules [localhost:3001/rules/groups](http://localhost:3001/rules/groups)

Please consult [**Panther Rules Documentation**](https://openanswers.github.io/panther-docs/#/rules/) for more information about how you can classify events and how Global and Group rules are used.


# Contributing

Please read [CONTRIBUTING.md](/CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

For general queries, please email the project team at <panther-support@openanswers.co.uk>. If you think you've found a bug or have an enhancement request, please check the Panther [issue management database](https://github.com/OpenAnswers/panther/issues) for existing issues before submitting [a new issue](https://github.com/OpenAnswers/panther/issues/new).

# Versioning

Panther uses a standard [SemVer](http://semver.org/) based semantic versioning scheme. For the versions available, see the [tags on this repository](https://github.com/OpenAnswers/panther-core/tags).


# License

This project is licensed under the Common Public Attribution License Version 1.0 - see the [LICENSE.txt](LICENSE.txt) file for more details.

# Authors

* [Open Answers](https://github.com/OpenAnswers)
  
See also the list of [contributors](https://github.com/OpenAnswers/panther-core/graphs/contributors) who have participated in this project.


# Acknowledgements

This project makes use of the following:

- [Docker](https://docker.com)
- [NodeJS](https://nodejs.org)
- [MongoDB](https://mongodb.com)
- [w2ui](http://w2ui.com)
- [D3.js](https://d3js.org)
- [coffeescript](https://coffeescript.org)
- [Bootstrap](https://getbootstrap.com)
- [jQuery](https://jquery.com)
- [jQueryUI](https://jqueryui.com)
