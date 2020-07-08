#!/usr/bin/env bash
# 
# Copyright (C) 2020, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  


type=$1
shift

[ -z "$MONITOR_HOST" ] && MONITOR_HOST="127.0.0.1"

sleep=${1:-10}
level=${2:-3}
start=${3:-1}
step=${4:-1}
message=${5:-this is the %s testing message from test.sh - %s}

format_message(){
  local name="$1"
  local count="$2"
  printf "$message" "$name" "$count" "$sleep" "$level" "$start" "$step"
}

test_syslogd(){
  i=${start}
  while true; do
    let i=i+${step}
    printf "$i "
    msg=$(format_message syslogd $i)
    logger -p ${level} "${msg}"
    sleep ${sleep}
  done
}

test_http(){
  command="queue" # or create
  [ -z "$PANTHER_API_TOKEN" ] && PANTHER_API_TOKEN=7IkTMlrHyZ0MeiKUcnKYvXqZdY1UThq4
  [ -z "$PANTHER_HTTP_MONITOR" ] && PANTHER_HTTP_MONITOR="http://${MONITOR_HOST}:5001/api/event"

  i=${start}
  msg=$(format_message http $i)
  while true; do
    let i=i+${step}
    printf "$i "
    json="{\"event\":{\"severity\":${level},\"summary\":\"${message} ${i}\",\"node\":\"$(hostname)\",\"tag\":\"trevs\"}}"
    echo "json[$json]"
    curl -X POST \
      -H "X-Api-Token: $PANTHER_API_TOKEN" \
      -H "Content-Type: application/json" \
      -d "$json" "$PANTHER_HTTP_MONITOR/$command" 
    sleep ${sleep}
  done
}


test_heartbeat_xmld(){
  send_heartbeat_xmld $MONITOR_HOST testhost "heartbeat test starting"
  while sleep $sleep; do
    let i=i+${step}
    printf "$i "
    message=$(format_message heartbeat_xmld $i)
    send_heartbeat_xmld $MONITOR_HOST testhost "$message"
  done
}

send_heartbeat_xmld(){
  # Author:
  #       Alex Bellia
  #       Open Answers
  #       support@openanswers.co.uk
  #
  # Description:
  #       Send alert from zabbix to heartbeat_xmld on oamon event console.
  #
  to=$1
  subject_hostname=$2
  message=$3
  nctimeout=10
  mtype=60000

  echo "<lert><mtype>${mtype}</mtype><hostname><"'!'"[CDATA[${subject_hostname}]]></hostname><message><"'!'"[CDATA[${message}]]></message></lert>" | nc -n -w ${nctimeout} ${to} 1234 
  ncret=$?
  if [ "$ncret" != "0" ]; then 
    printf "message failed [%s] " $ncret
  fi
}


test_graylog(){
  #echo -e '{"@version": "1","@timestamp":"2014-08-17T19:36:45.825Z","host":"example.org","message":"something","short_message":"Short message","full_message":"Backtrace here\n\nmore stuff","level":1,"_user_id":9001,"_some_info":"foo","_some_env_var":"bar"}' \
  # | gzip -c -f - \
  # | nc -uw 1 $MONITOR_HOST 12202
  echo -e '{"message":"55.3.244.1 GET /index.html 15824 0.043","@version":"1","@timestamp":"2014-08-17T19:36:45.825Z","host":"gz3.test","short_message":"Short","path":"/etc/logstash/ces","client":"55.3.244.1","method":"GET","request":"/index.html","bytes":"15824","duration":"0.043"}' \
   | gzip -c -f - \
   | nc -uw 1 127.0.0.1 12202
}

if [ "$type" == "syslogd" ]; then
  test_syslogd
elif [ "$type" == "http" ]; then
  test_http
elif [ "$type" == "graylog" ]; then
  test_graylog
elif [ "$type" == "heartbeat_xmld" ]; then
  test_heartbeat_xmld
else
  echo "ERROR: No type [$type] to run tests for"
  exit 1
fi
