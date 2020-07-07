
router = require('express').Router()


router.get '/', (req, res)->
  res.render 'settings',
    title: 'Settings'

router.get '/:action', (req, res)->
  res.render 'settings',
    title: 'Settings'


module.exports = router
