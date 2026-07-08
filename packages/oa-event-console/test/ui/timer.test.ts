//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
import { describe, it, expect } from 'vitest';

describe('Timer', function () {
  it('creates an instance', function () {
    const timer = new Timer();
    expect(timer).to.be.an.instanceof(Timer);
  });

  it('can start', function () {
    const timer = new Timer();
    expect(timer.start()).to.lte(Date.now());
  });

  it('can end', function () {
    const timer = new Timer();
    timer.start();
    const end = timer.end();
    expect(end).to.be.a('number');
    expect(end).to.lte(Date.now());
  });

  it('Timer.start', function () {
    const timer = Timer.start();
    expect(timer.startTime).to.lte(Date.now());
  });
});
