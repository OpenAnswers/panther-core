#!/usr/bin/env bash
# 
# Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  

i=0
while true; do
  r=$(( ( RANDOM % 7 )  + 1 ))
  logger -n localhost -p$r "A sample syslog message at random priority and intervals";
  let i=i+1
  sleep $(( ( RANDOM % 180 )  + 100 ))
done