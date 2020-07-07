#!/bin/sh

DIR=`dirname $0`

mongo oa $DIR/create_initial_external_classes.js
