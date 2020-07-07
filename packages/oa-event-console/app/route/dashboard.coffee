
# logging
{ logger, debug } = require('oa-logging')('oa:event:route:dashboard')

# npm modules
router = require('express').Router()


# Protect this route
router.use (req, res, next) ->
  if req.user?
    next()
  else
    logger.error 'Client tried to access dashboard without auth session', req.sessionID
    res.redirect "/?redirectUrl=#{req.originalUrl}"


# Dashboard
router.get '/', (req, res) ->
  res.render 'dashboard',
    title: 'Dashboard'
    user: req.user


module.exports = router
