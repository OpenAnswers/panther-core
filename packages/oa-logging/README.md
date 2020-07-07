# OA Logging


Provides a [debug](https://github.com/visionmedia/debug) and 
[winston](https://github.com/winstonjs/winston) logger tagged with a class name

Try and use the naming conventions of `oa:module:class` or `oa:app:class` and 
keep class names the same as file name so they can be tracked down easily

E.G `oa:event:console:app:whatever` maps to `node-oa-event_console/app/whatever`

## API

   { logger, debug } = require('oa-logging')('oa:event:class')

   debug 'something'

   logger.info 'something'
   logger.silly 'whatever;


### Loggers during tests

If you set the ENV variable NODE_ENV to "test" all logger will be put to `warn`

This is normally done in test/mocha_helpers.coffee

    process.env.NODE_ENV = 'test'

### Setting the log level

    logger.log_level 'whatever'

Note that if you set an unknown level logging will disappear, without warning.  

#### Node log levels

By default winstons uses npm's log levels. Which means `silly` instead of `trace`

### Winston default logger

Access the winston default log object via

    logger.default_logger

### Caveats

Winston treats and object as the last element to a log file as metadata
for tags. Logging an object as the last item may not come out as expected

This tries to attach the error object as metadata

   logger.error 'error', error

Whereas this is probably what you want

   logger.error 'error', error.message, error.stack
