# 
# Copyright (C) 2020, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  


router = require('express').Router()


router.get '/', (req, res)->
  res.render 'settings',
    title: 'Settings'

router.get '/:action', (req, res)->
  res.render 'settings',
    title: 'Settings'


module.exports = router
