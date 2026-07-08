// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
$(function () {
  return $('#form').w2form({
    name: 'form',
    url: 'server/post',
    header: 'Field Types',
    //formURL  : 'data/form.html'
    fields: [
      { field: 'Name', type: 'text', required: true },
      { field: 'Company', type: 'alphaNumeric', required: true },
      { field: 'Phone', type: 'int', required: true },
      { field: 'Pi', type: 'float', required: true },
      { field: 'Birth date', type: 'date' },
      { field: 'List', type: 'list', required: true, options: { items: ['Pluto', 'Lassie', 'Laika', 'Scooby'] } },
      {
        field: 'Enum',
        type: 'enum',
        required: true,
        options: { items: ['Example, One', 'Example, Two', 'Example, Three', 'Example, Four', 'Example, Five'] },
      },
      { field: 'field_textarea', type: 'text' },
      {
        field: 'field_select',
        type: 'select',
        required: false,
        options: { items: ['eu-west-1', 'us-east-1', 'ap-south-1'] },
      },
      { field: 'Event Console', type: 'checkbox', required: false },
    ],
    actions: {
      reset() {
        return this.clear();
      },
      save() {
        const obj = this;
        return this.save({}, function (data) {
          if (data.status === 'error') {
            console.log('ERROR: ' + data.message);
          }
          return obj.clear();
        });
      },
    },
  });
});
