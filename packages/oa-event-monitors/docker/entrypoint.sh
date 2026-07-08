#!/bin/sh
set -e

AGENT=${AGENT:-$1}

if [ -z "${AGENT}" ]
then
    echo "event-monitors <agent> values: ['http', 'syslogd']"
    exit 1
fi

cd "$(dirname "$0")"

exec node bin/oamon.js --name "${AGENT}" --configfile "etc/${AGENT}.ini"
