#!/bin/sh

MONGO_HOST=${MONGO_HOST:-mongodb}
MONGO_PORT=${MONGO_PORT:-27017}
MONGO_DB=${MONGO_DB:-panther}

export MONGO_URL="mongodb://${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}"

/wait-for-it.sh -h ${MONGO_HOST} -p ${MONGO_PORT} -t 20 -- \
  npm run migrate:up && \
  node lib/server