// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const util = require('util');

// This is where all the custom errors types live.
// It makes promises easier

const throw_a = function (type, message, ...vars) {
  let var_str = '';
  if (vars.length > 0) {
    const var_join = Array.from(vars)
      .map(vari => util.inspect(vari))
      .join('] [');
    var_str = ` [${var_join}]`;
  }

  throw new type(`${message}${var_str}`);
};

module.exports.throw_a = throw_a;
