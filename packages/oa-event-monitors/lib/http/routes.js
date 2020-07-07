
var debug, pkg, router

debug   = require('debug')('oa:event:monitors:http:routes')
router  = require('express').Router()
pkg     = require('../../package.json')


router.all("/api/*", function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*")
  res.header("Access-Control-Allow-Headers", "Cache-Control, Pragma, Origin, Authorization, Content-Type, X-Requested-With")
  res.header("Access-Control-Allow-Methods", "GET, PUT, POST")
  return next()
})


router.get('/', function(req, res) {
  return res.json({
    message: "Welcome to " + pkg.name + " " + pkg.version
  })
})


router.post('/api/event/queue', function(req, res) {
  return res.json({
    message: "Welcome to " + pkg.name + " " + pkg.version
  })
})


router.post('/api/event/create', function(req, res) {
  return res.json({
    message: "Welcome to " + pkg.name + " " + pkg.version
  })
})

module.exports = router
