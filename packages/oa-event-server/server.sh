#!/usr/bin/env bash
# 
# Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.  
# This file is subject to the terms and conditions defined in the Software License Agreement.
#


err_exit()
{
  echo "ERROR: $1"
  exit 1
}

#
# set up the OAMONHOME if not already defined
#
if [ -z "$OAMONHOME" ]
then
  FILEPATH=$(readlink -f $0)
  SCRIPT_DIRPATH=$(dirname $FILEPATH)
  export OAMONHOME=$(echo $SCRIPT_DIRPATH | sed 's#/EventServer##')
fi

test -d "${OAMONHOME}" ||  err_exit "OAMONHOME is not a directory";
test -r "${OAMONHOME}/EventServer/etc/server.ini" || err_exit "${OAMONHOME}/EventServer/etc/server.ini is not readable"
test -r "${OAMONHOME}/EventServer/lib/server.js" || err_exit "${OAMONHOME}/lib/server.js is not readable"

NODE_BIN=$(which node)
if [ $? -ne  0 ]
then
  err_exit "node is not in your path"
fi
test -x "${NODE_BIN}" || err_exit "node is not executable"

#
# set path to local node_modules
#

export NODE_PATH=${OAMONHOME}/node_modules

"$NODE_BIN" ${OAMONHOME}/EventServer/lib/server.js $*
