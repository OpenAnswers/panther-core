#!/bin/sh
#
# Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#
set -e

cd "$(dirname "$0")"

if [ -n "${ADMIN_USERNAME}" ] && [ -n "${ADMIN_PASSWORD}" ] && [ -n "${ADMIN_EMAIL}" ]
then
    node dist/bin/setup_user.js -c config.yml --user "${ADMIN_USERNAME}" --password "${ADMIN_PASSWORD}" --email "${ADMIN_EMAIL}" -g admin
fi

node dist/bin/setup_severity.js -c config.yml

# create one apikey for the admin user
if [ -n "${ADMIN_USERNAME}" ]
then
    node dist/bin/setup_apikey.js -o -c config.yml -u "${ADMIN_USERNAME}"
fi


exec node dist/app/start