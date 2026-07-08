// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
// ## Schedules
const debug_schedule = debug('oa:event:rules:schedules');

class Schedules {
  static initClass() {
    this.logger = debug_schedule;
    this.schedules_template = $('#rules-schedules-template').html();
    Mustache.parse(this.schedules_template);
    this.schedules_el = $('#rules-schedules-table');
    this.schedule_names = [];
  }

  static this_row_id(that) {
    return $(that).parentsUntil('tr.rules-schedule-row').parent().data('id');
  }

  static get_form(id) {
    const dow_inputs = $(`form.rules-schedule-edit-row[data-id=\"${id}\"]`);
    //dow_inputs = $('#schedule-'+id + ' input.rules-schedule-dow')
    this.logger('DOWs, ', dow_inputs);
    return dow_inputs;
  }

  static get_schedule_row(id) {
    return $(`tr[data-id=\"${id}\"]`);
  }

  static unhide_update_button(id) {
    const update_button = $(`tr[data-id=\"${id}\"] button.rules-schedule-update-button`);
    return update_button.removeClass('hidden');
  }

  static hide_update_button(id) {
    const update_button = $(`tr[data-id=\"${id}\"] button.rules-schedule-update-button`);
    return update_button.addClass('hidden');
  }

  static edit_row(id) {
    this.logger(' EDITING ROW: ', id);
    return this.unhide_update_button(id);
  }

  //    @logger "EDITED data", data
  //    self = @
  //    socket.emit "schedule::update::days", data, (error, response)->
  //      self.logger "schedule::update::days with", error, response
  //      if error
  //        return Message.error ErrorType.from_object( error )

  static delete_row(id) {
    const data = { uuid: id };
    const self = this;
    return socket.emit('schedule::delete', data, function (error, response) {
      self.logger('schedule::delete response', error, response);
      if (error) {
        return Message.error(ErrorType.from_object(error));
      }
    });
  }

  static render_schedules(schedules) {
    debug_schedule('Rendering...', schedules);
    schedules.forEach(schedule => schedule.days.forEach(day => (schedule[day] = true)));
    return this.schedules_el.html(Mustache.render(this.schedules_template, { schedules }));
  }

  static startit() {
    socket.emit('schedules::read', {}, (error, data) => debug_schedule(data));

    socket.emit('schedule::read', { name: 'out of hours' }, (error, data) => console.log(' OOH ', data));

    return true;
  }

  static send_read_all(cb) {
    return socket.emit('schedules::read', {}, function (error, response) {
      debug_schedule('read schedule data', response.data);
      return Schedules.render_schedules(response.data);
    });
  }

  static send_create(data, cb) {
    debug_schedule('Sending...', data);

    const payload = {
      name: data.name,
      start: data.start,
      end: data.end,
      days: data.days,
    };
    return socket.emit('schedule::create', { data: payload }, function (error, response) {
      debug_schedule('Created schedule returned', response);
      if (!error) {
        debug_schedule('created');
      }

      if (cb) {
        return cb(error, response);
      }
    });
  }

  static send_update(data, cb) {
    const payload = {
      name: data.name,
      start: data.start,
      end: data.end,
      days: data.days,
    };

    return socket.emit('schedule::update', { data: payload }, function (error, response) {
      debug_schedule('Update schedule returned', response);

      if (cb) {
        return cb(error, response);
      }
    });
  }

  static send_update_days(id) {
    const formData = this.get_form(id).serializeArray();
    this.logger('ROW', formData);
    const days = formData.map(d => d.value);
    const data = { uuid: id };
    data.days = days;

    const self = this;
    return socket.emit('schedule::update::days', data, function (error, response) {
      self.logger('schedule::update::days with', error, response);
      if (error) {
        return Message.error(ErrorType.from_object(error));
      }
      return self.hide_update_button(id);
    });
  }

  static send_delete(data, cb) {
    const payload = { name: data.name };

    return socket.emit('schedule::delete', { data: payload }, function (error, response) {
      debug_schedule('Deleting schedule returned', response);

      if (cb) {
        return cb(error, response);
      }
    });
  }
}
Schedules.initClass();

window.Schedules = Schedules;

// onload — after class definition because module scripts are deferred
$(function () {
  Schedules.send_read_all();

  debug_schedule('SCHEDULESCLASS');

  socket.on('schedules::updated', updates => Schedules.send_read_all());

  $('#rules-schedule-create').on('submit', function (ev) {
    ev.preventDefault();

    debug_schedule('Creating a new schedule...');
    const data = {
      days: [],
    };
    $(ev.target)
      .serializeArray()
      .forEach(function (x) {
        if (x.name === 'schedule-name') {
          data['name'] = x.value;
        }
        if (x.name === 'schedule-start') {
          data['start'] = x.value;
        }
        if (x.name === 'schedule-end') {
          data['end'] = x.value;
        }
        if (x.name === 'days') {
          return data.days.push(x.value);
        }
      });

    return Schedules.send_create(data, function (error, response) {
      if (error) {
        return Message.error(ErrorType.from_object(error));
      } else {
        return Message.info_label('Schedule', 'created / updated');
      }
    });
  });

  $('#rules-schedules-table').on('click', 'tr.rules-schedule-row .rules-schedule-edit-row', function (ev) {
    debug_schedule('ROWCLICK');
    const id = Schedules.this_row_id(ev.target);
    return Schedules.edit_row(id);
  });

  $('#rules-schedules-table').on('click', 'tr.rules-schedule-row .rules-schedule-update-button', function (ev) {
    debug_schedule('update row');
    const id = Schedules.this_row_id(ev.target);
    return Schedules.send_update_days(id);
  });

  return $('#rules-schedules-table').on('click', 'tr.rules-schedule-row .rules-schedule-delete-button', function (ev) {
    debug_schedule('delete row');
    const id = Schedules.this_row_id(ev.target);
    return Schedules.delete_row(id);
  });
});
