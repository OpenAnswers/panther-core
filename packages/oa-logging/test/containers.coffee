winston = require 'winston'
MongoDB = require('winston-mongodb').MongoDB

winston.loggers.options.transports = []

container = new winston.Container transports: [
  new (winston.transports.Console)(),
  new (winston.transports.File)({ filename: 'somefile.log' })
  new (winston.transports.MongoDB({
    db:'mongodb://localhost:27017/oa'
    collection: 'logs'
    capped: true
    cappedSize: 10000000
    name: 'default'
  })
]

winston.loggers.add 'oa:event:whatever', transports: []
winston.loggers.add 'oa:event:next', transports: []
winston.loggers.add 'oa:event:indubitably', transports: []


l1 = winston.get 'oa:event:whatever'
l2 = winston.get 'oa:event:next'
l3 = winston.get 'oa:event:indubitably'


l1.info 'whatever test'

l2.info 'next test'

l3.info 'indubitably test'
