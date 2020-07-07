
router = require('express').Router()

router.get '/:page', (req, res)->
  res.render 'test/'+req.params.page,
    title: 'Tests'

module.exports = router
