#!/bin/sh -x
# delete any event if it 
#     + has'nt occurred with the last $HOURS hours 
#     + the owner is an auto-ack user
HOURS=6   
DB=panther

$PRE_MONGO_COMMAND mongo $DB --eval 'db.alerts.remove({owner:{ $in: ["mps_auto_acknowledge","cqc_test_auto_ack","cqc_uat_auto_ack"]}, last_occurrence: {$lt: new Date(ISODate().getTime()- 60*60*'$HOURS'*1000) } })'