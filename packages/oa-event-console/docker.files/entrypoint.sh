#!/bin/sh

if [ ! -z "${ADMIN_USERNAME}" -a ! -z "${ADMIN_PASSWORD}" -a ! -z "${ADMIN_EMAIL}" ]
then
    node bin/setup_user.js --user ${ADMIN_USERNAME} --password ${ADMIN_PASSWORD} --email ${ADMIN_EMAIL} -g admin
fi

node bin/setup_severity.js -c config.yml


node app/start