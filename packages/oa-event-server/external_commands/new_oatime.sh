#!/bin/sh


OATIME_BIN="/vol04/oatimeprd/bin/oatime"
OATIME_REMOTE_HOST="burton"
OATIME_ARGS="open -x -A Raised" #command line injection, we'll append the rest of the args below

DEFAULT_USER=vince #catch all
#
# convert a numeric severity value to string for oatime
#

case $severity in
  0) SEVERITY=Low
    ;;

  1) SEVERITY=Low
    ;;

  2) SEVERITY=Medium
    ;;

  3) SEVERITY=Medium
    ;;

  4) SEVERITY=High
    ;;
  5) SEVERITY=Critical
    ;;
  *) SEVERITY=Low
    ;;
esac

CUSTOMER=OA
if [ ! -z "$customer" ]
then
  CUSTOMER=$customer
fi

TITLE=$summary
NOTE="oaec generated message for host: $node"
PROJECT="Support"

USER=$DEFAULT_USER
if [ !  -z "$owner" ]
then
  USER=$owner
fi

TYPE="General"


CMD="$OATIME_BIN $OATIME_ARGS -T '$TYPE' -N '$NOTE' -P '$SEVERITY' -c '$CUSTOMER' -p $PROJECT -u $USER -t '$TITLE'"

OUTPUT=`ssh $OATIME_REMOTE_HOST "$CMD"`

OA_TIME_ID=`echo "$OUTPUT" | awk '{ print $2}'`
echo "external_id=$OA_TIME_ID"
