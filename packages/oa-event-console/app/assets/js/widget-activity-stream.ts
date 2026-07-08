// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
// ----------------------------------------------------------------

const Cls = (window.ActivityStream = class ActivityStream {
  static initClass() {
    this.logger = debug('oa:event:console:activity-stream');
  }

  static handlePopulate() {
    return socket.on('activities::populate', function (docs) {
      docs = docs.reverse();
      docs = docs.slice(0, 4);
      return docs.reverse().map(doc => ActivityStream.processActivity(doc, false));
    });
  }

  static handleNewActivity() {
    return socket.on('activity', doc => ActivityStream.processActivity(doc));
  }

  static joinActivitiesRoom() {
    return socket.emit('activities::join_room');
  }

  static html_user(username) {
    return `<a href='#'>${username}</a>`;
  }

  static processActivity(doc, animate) {
    animate ??= true;
    this.logger('activity doc', doc);
    const data = {};
    data.time = doc.time;
    data.message = 'No message';
    const user = this.html_user(doc.username);

    if (doc.category === 'event') {
      const count = doc.metadata.ids.length;

      switch (doc.type) {
        case 'acknowledge':
          if (count === 1) {
            data.message = `${user} acknowledged <a href='/console#/event/${doc.metadata}'>an event.</a>`;
          } else {
            data.message = `${user} acknowledged ${count} events.`;
          }
          break;

        case 'unacknowledge':
          if (count === 1) {
            data.message = `${user} unacknowledged <a href='/console#/event/${doc.metadata}'>an event.</a>`;
          } else {
            data.message = `${user} unacknowledged ${count} events.`;
          }
          break;

        case 'assign':
          if (count === 1) {
            data.message = `${user} assigned <a href='/console#/event/${doc.metadata.ids}'>an event</a> to <a href='#'>${doc.metadata.new_owner}.</a>`;
          } else {
            data.message = `${user} assigned ${count} events to <a href='#'>${doc.metadata.new_owner}.</a>`;
          }
          break;

        case 'severity':
          if (count === 1) {
            data.message = `${user} changed <a href='/console#/event/${doc.metadata.ids}'>an event's</a> severity.`;
          } else {
            data.message = `${user} changed ${count} events' severities.`;
          }
          break;

        case 'clear':
          if (count === 1) {
            data.message = `${user} cleared <a href='/console#/event/${doc.metadata.ids}'>an event.</a>`;
          } else {
            data.message = `${user} cleared ${count} events.`;
          }
          break;

        case 'delete':
          if (count === 1) {
            data.message = `${user} deleted <a href='/console#/event/${doc.metadata}'>an event.</a>`;
          } else {
            data.message = `${user} deleted ${count} events.`;
          }
          break;

        case 'delete-all':
          data.message = `${user} deleted all events`;
          break;

        case 'external_id':
          data.message = `${user} added an external_id`;
          break;
      }
    } else {
      //message_fmt = doc.message
      data.message = doc.message ? doc.message.html || doc.message.text : 'nope';
    }

    const entry = $(Mustache.render($('#template-activity-stream-entry').html(), { data }));
    const entriesPresent = $('.activity-widget .entry').length;
    if (entriesPresent === 4) {
      $('.activity-widget .entry').last().remove();
    }

    if (animate) {
      entry.hide();
      entry.prependTo('.activity-widget').animate({ height: 'toggle', opacity: 'toggle' }, 'slow');
    } else {
      entry.prependTo('.activity-widget');
    }

    return $(entry).find('.details').timeago();
  }
});
Cls.initClass();

// On DOM ready — must be after class definition because module scripts
// are deferred, so $(function(){}) fires immediately.
$(function () {
  ActivityStream.handlePopulate();
  ActivityStream.handleNewActivity();
  return ActivityStream.joinActivitiesRoom();
});
