
mocha.setup globals: ['Message', 'Notification']

describe 'Message', ->

  it '.debug', ->
    Message.debug("debug1","debug2","debug3")

  it '.info', ->
    Message.info("info1","info2","info3")

  it '.warn', ->
    Message.warn("warn1","warn2","warn3")

  it '.error', ->
    Message.error("error1","error2","error3")
