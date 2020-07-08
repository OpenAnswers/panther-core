#!/bin/sh
#
# Copyright (C) 2020, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#


if [ ! -z "${ADMIN_USERNAME}" -a ! -z "${ADMIN_PASSWORD}" -a ! -z "${ADMIN_EMAIL}" ]
then
    node bin/setup_user.js --user ${ADMIN_USERNAME} --password ${ADMIN_PASSWORD} --email ${ADMIN_EMAIL} -g admin
fi

node bin/setup_severity.js -c config.yml

# create one apikey for the admin user
if [ ! -z "${ADMIN_USERNAME}" ]
then
    node bin/setup_apikey.js -o -c config.yml -u ${ADMIN_USERNAME}
fi


node app/start