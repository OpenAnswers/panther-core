//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// # Jade Pre Cache

// This compiles and caches all the Jade so express doesn't do it first pass

// logging modules
const {debug, logger} = require('oa-logging')('oa:express:path');

const { globSync } = require('glob');
const pug = require('pug');

const options: { cache: boolean; compileDebug: boolean; filename?: string } = {cache: true, compileDebug: false};

module.exports = function( pug_path ) {
  logger.debug('pug pre render start');
  try {
    const files = globSync(`${pug_path}/**/*.pug`, { ignore: `${pug_path}/**/test/**/*.pug` });
    if (files.length === 0) { logger.error('pug pre render found no files'); }
    files.forEach(function( file ){
      const file_path = file;
      logger.debug('pug pre render file', file_path);
      options.filename = file_path;
      pug.compileFile(file_path, options);
    });
  } catch(err) {
    logger.error('pug pre render', err);
  }
};

