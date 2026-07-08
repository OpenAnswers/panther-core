#!/bin/sh -x
# delete any event if it has'nt occurred with the last $HOURS hours
HOURS=24
DB=panther

$PRE_MONGO_COMMAND mongo $DB --eval 'db.alerts.remove({last_occurrence: {$lt: new Date(ISODate().getTime()- 60*60*'$HOURS'*1000) } })'