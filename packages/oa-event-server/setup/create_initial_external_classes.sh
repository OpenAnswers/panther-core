#!/bin/sh
#
# Copyright (C) 2012, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.  
# This file is subject to the terms and conditions defined in the Software License Agreement.
# 


DIR=`dirname $0`

mongo oa $DIR/create_initial_external_classes.js
