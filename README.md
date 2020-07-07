#### Table of Contents

- [Build Instructions (without Docker)](#build-instructions-without-docker)
  - [Install build dependencies](#install-build-dependencies)
  - [Bootstrap and run the build](#bootstrap-and-run-the-build)
- [Running](#running)
- [Build Instructions (with docker)](#build-instructions-with-docker)
- [Running (with Docker)](#running-with-docker)
- [Login](#login)
- [Regressions](#regressions)

# Build Instructions (without Docker)

## Install build dependencies

`npm i -g lerna`

## Bootstrap and run the build

`lerna boostrap`

`lerna run build`

# Running

- start mongodb

  `docker-compose up mongodb`

- initialise the database

  `lerna run setup`

- Start the event-server, event-console and http monitor

  `yarn run start/all`

# Build Instructions (with docker)

`docker-compose -f build/docker-compose.yml build`

# Running (with Docker)

`docker-compose up`

# Login

http://localhost:3001

Default account details:

- `username:` `admin`
- `password:` `admin`

# Regressions

- [ ] packages/oa-event-monitors requires gelf-manager, which requires node 0.6
