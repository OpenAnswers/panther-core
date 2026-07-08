#!/bin/sh
# 
# Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  


DIR=`dirname $0`

mongo oa $DIR/create_initial_severities.js 
