#### Table of Contents

- [Build Instructions](#build-instructions)
  - [Prerequisites](#prerequisites)
  - [Install build dependencies](#install-build-dependencies)
  - [Running the build](#running-the-build)
  - [Starting Panther](#starting-panther)
- [Login](#login)
  - [Default login details](#default-login-details)
- [Configuration](#configuration)
  - [Panther rules](#panther-rules)
- [Sending events to Panther](#sending-events-to-panther)
  - [Sending events using syslog](#sending-events-using-syslog)
  - [Sending events using HTTP](#sending-events-using-http)

![Panther Logo](/packages/oa-event-console/public/panther_logo_border.png)

# Build Instructions

To build from a source code checkout.

## Prerequisites

Panther uses [MongoDB](https://mongodb.com) for its underyling storage. The default Panther configuration expects that to be accessible via `localhost:27017`.

## Install build dependencies

The build system uses [Lerna](https://github.com/lerna/lerna) for co-ordinating the build and [Yarn](https://github.com/yarnpkg/yarn) for resolving package dependencies.

If these are not already installed you'll need to:

```bash
npm i -g lerna@7 yarn@1.22
```

## Running the build

Install the `npm` dependencies

```bash
NODE_ENV=development yarn install
```

Download external dependencies (fonts, JS), this only needed the first time

```bash
lerna run install-deps
```

Build the software

```bash
lerna run build
```

## Starting Panther

If you don't have MongoDB installed, use the provided `docker-compose.yml` file to get you quickly started

- Start the database (Optional)

If you don't already have MongoDB running you can use the `docker-compose.yml` to bring it up.
**Note** you'll therefore need `docker` and `docker-compose` installed

```bash
docker-compose up mongodb
```

- Initialise MongoDB

**MongoDB** must be up and accessible at `localhost:27017`

```bash
lerna run setup
```

- Start all Panther components

  ```bash
  yarn run start/all
  ```

Panther should now be accessible via [localhost:3001](http://localhost:3001)

[Default login details](#default-login-details) can be found below

# Login

Panther should now be running locally and can be accessed through the web interface at

http://localhost:3001

## Default login details

An initial admin user was created during the setup process, credentials are as follows,

- `username:` `admin`
- `password:` `admin`

# Configuration

The following applies only when running without Docker, the instructions can be adopted to run within the Docker container but this is not yet documented.

There are two main configuration files located here:

- `packages/oa-event-console/config.yml`
- `packages/oa-event-server/etc/server.ini`

Comments are provided inline

The default configurations assume the project is accessed via `localhost`, if you plan on accessing it via another hostname, the following additional config changes will need to be made:

**event-console**

config file `packages/oa-event-console/config.yml` will need updating with correct values as follows:

```
app:
   url: "http://localhost:3001" # The url used to access Panther
http:
   port: 3001 # Must match the port number in app.url above
event_monitors:
   # Used to inform the browser where the HTTP monitor is listening when accessing `/apiconsole`
   http:
      host: "localhost"
      port: 5001
smtp:
   # SMTP server used to send out password reset reminders
   host: "mta.example.com"
   port: 25
```

## Panther rules

These are the rules behind how Panther interprets and categorizes incoming events from the HTTP and Syslogd monitor.

The main rules file is `/rules/server.rules.yml` this is where the majority of user defined rules live.

They can be edited by hand using a text editor but the recommened method is via the web interface:

- [Global Rules](http://localhost:3001/rules/globals)
- [Group Rules](http://localhost:3001/rules/groups)

All rules files are saved in `/rules`. Please consult [Panther Rules Documentation](https://openanswers.github.io/panther-docs/#/rules/) for more information.

# Sending events to Panther

Using the default build there are two ways to send events to Panther, **Syslog** and **HTTP**.

## Sending events using syslog

The Panther syslogd monitor will be listening by default on localhost:1514/tcp to send a test message use the following:

```bash
logger -T -n localhost -P 1514 "Hello from the command line"
```

To send events from another syslog agent, please consult your documentation.

Fowarded messages must be sent via the TCP transport, and not UDP.

## Sending events using HTTP

First ensure that an API key has been created, please consult the [Panther Documentation](https://openanswers.github.io/panther-docs/#/admin/README?id=api-keys) for how to set this up.

With an API key send an event using curl:

```bash
curl -X POST -H 'X-Api-Token: <YOUR-API_KEY>' -H 'Content-Type: application/json' -d '{"event":{"node":"myhostname","tag":"event-tag","summary":"Hello from http","severity":1}}' 'http://localhost:5001/api/event/create'
```

