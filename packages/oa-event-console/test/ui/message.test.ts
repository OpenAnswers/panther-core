//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
import { describe, it, expect, vi, afterEach } from 'vitest';

describe('Message', function () {
  let logSpy: any;

  afterEach(function () {
    logSpy?.mockRestore();
  });

  it('.debug', function () {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    Message.debug('debug1', 'debug2', 'debug3');
    expect(logSpy).toHaveBeenCalled();
  });

  it('.info', function () {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    Message.info('info1', 'info2', 'info3');
    expect(logSpy).toHaveBeenCalled();
  });

  it('.warn', function () {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    Message.warn('warn1', 'warn2', 'warn3');
    expect(logSpy).toHaveBeenCalled();
  });

  it('.error', function () {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    Message.error('error1', 'error2', 'error3');
    expect(logSpy).toHaveBeenCalled();
  });
});
