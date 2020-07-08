#!/bin/sh

AGENT_NAME=${BUILD_AGENT_NAME:-$1}


if [ -z "${AGENT_NAME}" ]
then
    echo "event-monitors <name>"
    exit 1
fi


node bin/oamon.js --name ${AGENT_NAME} --configfile etc/${AGENT_NAME}.ini
