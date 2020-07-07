#!/bin/sh
#
# script sample_command.sh
# run when the user selects an external command from the frontend
# values for the columns on the alert are passed in via the environment
# an empty column will have an empty string ''.
#
# script output:
# in order to update the alert in the database this script must echo
# to stdout a list of name=value pairs that will then be persisted 
# to the database storage via the server.
#
# example:
# script receives the following values:
#
# _id='4e95a336f5b2c0070a3f614d'
# agent='syslog'
# agent_group=''
# alert_group=''
# alert_key=''
# class=''
# customer=''
# external_class='oatime'
# external_id=''
# first_occurrence='Wed Oct 12 2011 15:24:54 GMT+0100 (BST)'
# flags='H'
# identifier='vince-desktop:notice:arpalert:ip_change:10.103.116.70'
# last_occurrence='Wed Oct 12 2011 16:13:36 GMT+0100 (BST)'
# location=''
# node='vince-desktop'
# node_alias=''
# notes=''
# owner=''
# proxy_agent=''
# severity='1'
# state_change='1320326870971'
# summary='ip_change from 10.103.116.70 to 10.103.116.72'
# tally='141'
# type=''
#
#
# we'd like to open a ticket in our external bug tracker.  this bug tracker 
# should generate a unique identifier that we can than update the alert
# with to keep track of it.
# 
# the alerts table has a column named: external_id, which we can use for this purpose
# 
# this script would call a command line interface to our bug tracker, something like:
#
# CALL_ID=`/usr/local/bin/open_new_bug --summary "$summary"`
# we are expecting this command to print out a unique CALL_ID
# which we could then return to the server via:
#
# echo "external_id=$CALL_ID"

