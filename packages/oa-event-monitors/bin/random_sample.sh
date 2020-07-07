#!/usr/bin/env bash
i=0
while true; do
  r=$(( ( RANDOM % 7 )  + 1 ))
  logger -n localhost -p$r "A sample syslog message at random priority and intervals";
  let i=i+1
  sleep $(( ( RANDOM % 180 )  + 100 ))
done