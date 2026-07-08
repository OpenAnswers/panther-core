// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
// http://lions-mark.com/jquery/scrollTo/

$('.scroll_spy_nav').fn.scrollTo = function (target, options, callback) {
  if (typeof options === 'function' && arguments.length === 2) {
    callback = options;
    options = target;
  }

  const settings = $.extend(
    {
      scrollTarget: target,
      offsetTop: 50,
      duration: 500,
      easing: 'swing',
    },
    options
  );

  return this.each(function () {
    const scrollPane = $(this);

    const scrollTarget = typeof settings.scrollTarget === 'number' ? settings.scrollTarget : $(settings.scrollTarget);

    const scrollY =
      typeof scrollTarget === 'number'
        ? scrollTarget
        : scrollTarget.offset().top + scrollPane.scrollTop() - parseInt(settings.offsetTop);

    return scrollPane.animate({ scrollTop: scrollY }, parseInt(settings.duration), settings.easing, function () {
      if (typeof callback === 'function') {
        return callback.call(this);
      }
    });
  });
};
