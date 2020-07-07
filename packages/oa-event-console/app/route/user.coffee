
router = require('express').Router()


router.get '/', (req, res)->
  res.render 'index', { title: 'User', message: 'Hello there!'}


module.exports = router