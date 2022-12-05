#!/usr/bin/env bash
#
# Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.  
# This file is subject to the terms and conditions defined in the Software License Agreement.
#




NODE_MINIMUM_MAJOR="0"
NODE_MINIMUM_MINOR="4"
NODE_MINIMUM_MINI="0"

err_exit()
{
  echo "ERROR: $1"
  exit 1
}

#
# set up the OAFHOME if not already defined
#
if [ -z "$OAFHOME" ]
then
  if which greadlink 2>/dev/null 1>/dev/null; then
    readlink=greadlink
  else
    readlink=readlink
  fi
  FILEPATH=$($readlink -f $0)
  SCRIPT_DIRPATH=$(dirname $FILEPATH)
  export OAFHOME=$(echo $SCRIPT_DIRPATH | sed 's#monitors/bin##')
fi

test -d "${OAFHOME}" ||  err_exit "OAFHOME is not a directory";

#
# set path for node_modules
#

export NODE_PATH=${OAFHOME}/node_modules

NODE_BIN=$(which node)
if [ $? -ne 0 ]
then
  err_exit "node is not in your path"
fi
test -x "${NODE_BIN}" || err_exit "node is not executable"

# check node version

NODE_VERSION_STRING=$($NODE_BIN -v)
echo "${NODE_VERSION_STRING}" | grep -e '^v[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*'
if [ $? -ne 0 ]
then
  err_exit "Couldn't find a node version string in: ${NODE_VERSION_STRING}"
fi
NODE_VERSION_NUMBERS=$(echo "${NODE_VERSION_STRING}" | sed s'/^v//')

NODE_MAJOR=$(echo "${NODE_VERSION_NUMBERS}" | cut -d. -f1)
test $NODE_MAJOR -ge $NODE_MINIMUM_MAJOR || err_exit "node is too old (MAJOR)"

NODE_MINOR=$(echo "${NODE_VERSION_NUMBERS}" | cut -d. -f2)
test $NODE_MINOR -ge $NODE_MINIMUM_MINOR || err_exit "node is too old (MINOR)"

NODE_MINI=$(echo "${NODE_VERSION_NUMBERS}" | cut -d. -f3)
test $NODE_MINI -ge $NODE_MINIMUM_MINI || err_exit "node is too old (MINI)"

export OAMON_NAME=$(basename $0)
if [ $OAMON_NAME != "socket_probe.sh" ]
then
  # strip any trailing .sh's
  TMPNAME=$( echo $OAMON_NAME | sed 's#\.sh##' )
  export OAMON_NAME=$TMPNAME
fi

$NODE_BIN ${OAFHOME}/monitors/bin/oamon.js -name $OAMON_NAME $*
