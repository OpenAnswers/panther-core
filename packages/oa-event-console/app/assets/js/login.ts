// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
$(function () {
  // Animate panther background
  $('.bg-container').animate({ opacity: '1' }, 4000);

  // Check for invalid login
  if (window.location.search.includes('failed-login')) {
    $('#login-error-failed').removeClass('hidden');
  }
  if (window.location.search.includes('account-locked')) {
    $('#login-error-locked').removeClass('hidden');
  }

  // Tests browsers for various things
  // Trusts javascript before userAgent, can let you know when they are different
  const details = Browser.browser_details();

  if (Browser.isnt_chrome) {
    $('#login-notchrome').removeClass('hidden');
  }
  if (details.mobiley) {
    return $('#login-mobiley').removeClass('hidden');
  }
});
