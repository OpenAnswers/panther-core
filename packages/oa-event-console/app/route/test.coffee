# 
# Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  


router = require('express').Router()

router.get '/:page', (req, res)->
  res.render 'test/'+req.params.page,
    title: 'Tests'

module.exports = router
