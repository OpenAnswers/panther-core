
# logging
{ debug, logger }   = require('oa-logging')('oa:event:route:debug')

# npm modules
router = require('express').Router()


# Protect this route
router.use (req, res, next) ->
  if req.user?
    next()
  else
    logger.error 'Client tried to access /debug without auth session', req.sessionID
    res.redirect "/?redirectUrl=#{req.originalUrl}"


# Admin this route
router.use (req, res, next) ->
  debug 'req.user', req.user, req.user.group
  if req.user.group and req.user.group is 'admin'
    next()
  else
    logger.error 'Client tried to access /debug without admin permissions', req.sessionID
    res.redirect "/dashboard?error=not-an-admin"


router.get '/', (req, res) ->
  res.render 'debug',
    title: 'Debug'
    user: req.user

    
module.exports = router
