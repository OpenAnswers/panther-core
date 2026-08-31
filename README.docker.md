#### Table of Contents

- [Getting Started](#getting-started)
  - [Build Instructions](#build-instructions)
    - [Prerequisites](#prerequisites)
    - [Running the build](#running-the-build)
    - [Starting Panther](#starting-panther)
- [Configuration](#configuration)
  - [Plugin extensions](#plugin-extensions)

# Getting Started

The process for building and running Panther in a Dockerised environment can be done by following these steps

## Build Instructions

The entire build process can be done within Docker containers and will generate Docker images that can be run with [docker-compose.yml](/docker-compose-development.yml)

This minimises the steps required to get up and running.

### Prerequisites

[Docker](https://docker.com) version >= 29.6

### Running the build

```bash
docker compose -f build/docker-compose.yml build
```

### Starting Panther

Once the container images have been built, which you can check with:

```bash
localhost% docker images | grep event-
event-monitors      latest        7ab860a16a6a   2 minutes ago   129MB
event-console       latest        a15e9e272c7d   5 minutes ago   189MB
event-server        latest        949b38268a9b   9 minutes ago   127MB
event-monitors-http latest        7be9a8654d61   2 days ago      129MB
```

They can be started with:

```bash
docker compose -f docker-compose-development.yml up
```

# Configuration

Panther in Docker can be configured by modifying the environment variables in [.env](/.env), allowing you to change the default admin username and password. The default file sets the following:

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin
ADMIN_EMAIL=me@my.domain
```

## Plugin extensions

For plugin hook documentation and service config examples, see [PLUGIN_EXTENSIONS.md](/PLUGIN_EXTENSIONS.md).

For pre-built Docker images, the console and server containers now support runtime plugin installation with `PANTHER_PLUGIN_INSTALL`, which accepts a JSON array of npm install targets. This is the recommended way to add third-party plugins to stock DockerHub images without rebuilding them.
