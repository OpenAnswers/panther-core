// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
const debug_apiconsole = debug('oa:event:console:apiconsole');

// ### ApiConsole

class ApiConsole extends Rendered {
  static initClass() {
    this.logger = debug_apiconsole;

    this.option_template = $('#template-apiconsole-option').html();
    // @options_template = $('#template-apiconsole-options').html()
    // @select_template = $('#template-apiconsole-select').html()
    // @fields_template = $('#template-apiconsole-fields').html()
    // @body_template = $('#template-apiconsole-textarea').html()
    // @curl_template = $('#template-apiconsole-readonly').html()

    Mustache.parse(this.option_template);
    // Mustache.parse @options_template
    // Mustache.parse @select_template
    // Mustache.parse @fields_template
    // Mustache.parse @body_template
    // Mustache.parse @curl_template

    this.$container = $('#apiconsole-event');

    this.api = {
      server: {
        scheme: 'http',
        host: 'localhost',
        port: '5001',
      },

      endpoints: {
        event: {
          label: 'Event API',
          tag: 'Create or Queue events via the HTTP Agent API',
          fields: [
            {
              id: 'event-type',
              label: 'Request',
              type: 'radio-inline',
              data_type: 'string',
              options: [
                {
                  id: 1,
                  value: 'create',
                  label: 'Create Event',
                },
                {
                  id: 2,
                  value: 'queue',
                  label: 'Queue Event',
                },
              ],
            },
            {
              id: 'apikey',
              label: 'API Key',
              type: 'select',
              data_type: 'string',
              options: [
                {
                  id: 1,
                  value: 'Api Data Value1',
                  lable: 'Api Data Name1',
                },
                {
                  id: 2,
                  value: 'Api Data Value2',
                  lable: 'Api Data Name2',
                },
              ],
            },
            {
              id: 'node',
              label: 'Node',
              type: 'text',
              data_type: 'string',
            },
            {
              id: 'tag',
              label: 'Tag',
              type: 'text',
              data_type: 'string',
            },
            {
              id: 'summary',
              label: 'Summary',
              type: 'text',
              data_type: 'string',
            },
            {
              id: 'severity',
              label: 'Severity',
              type: 'text',
              placeholder: 'integer',
              data_type: 'integer',
            },
          ],
        },
      },
    };
  }

  constructor() {
    super();
  }

  static render(options) {
    let data;
    const tokens_data = global_api_tokens.map(
      token =>
        (data = {
          value: token,
          label: token,
        })
    );
    this.logger('rendering token data', data);
    return $('#input-apikey').html(Mustache.render(this.option_template, { options: tokens_data }));
  }

  static handlers(options) {
    const self = this;
    //super options

    // on body change build curl/request
    // set modified flag for field warning
    $('.output-builder').on('input change', ev => self.handler_output_change());
    // on forms cahnge build body

    return $('#btn-send').on('click', function (ev) {
      const $btn = $(this);
      ev.preventDefault();
      ev.stopPropagation();
      self.handler_send($btn);
      return false;
    });
  }

  static handler_send($btn) {
    const self = this;
    $btn.button('loading');
    const details = this.dom_to_obj();
    const url = this.build_url(details);
    const json_data = JSON.stringify(details.body);

    return $.ajax(url, {
      type: 'POST',
      data: json_data,
      contentType: 'application/json',
      dataType: 'json',
      processData: false,
      //jsonp: false
      headers: {
        'X-Api-Token': details.apikey,
      },
      success(data, status, other) {
        $btn.button('reset');
        self.logger('success', data, status, other);
        const response_str = JSON.stringify(data, null, 2);
        return $('#output-response').html($('<pre>', { text: response_str }));
      },
      error(response, error_text, error_thrown) {
        let response_str;
        self.logger('failure [%s]', error_text, response, error_thrown);
        if (response.status === 0) {
          response_str = 'There was an error sending your request';
        } else {
          response_str = 'Error ' + response.status + '\n' + response.responseText;
        }
        return $('#output-response').html($('<pre>', { text: response_str }));
      },
      complete() {
        return $btn.button('reset');
      },
    });
  }

  static handler_reset() {
    const details = this.dom_to_obj();
    this.set_body(details);
    this.set_curl(details);
    return this.set_url(details);
  }

  static handler_output_change() {
    const details = this.dom_to_obj();
    this.set_body(details);
    this.set_curl(details);
    this.set_url(details);
    return this.set_apikey_copy();
  }

  static render_custom(users) {
    return this.set_selected_group(users);
  }

  static build_url(obj) {
    const url = global_api_url ? global_api_url : 'http://localhost:5001';
    return `${url}/api/event/${obj.eventtype}`;
  }

  static set_url(details) {
    const url_val = this.build_url(details);
    this.logger('url value', url_val);
    return $('#output-url').val(url_val);
  }

  static build_curl(obj) {
    const json_body = JSON.stringify(obj.body);
    const url = this.build_url(obj);
    const cmd = [
      'curl -X POST',
      `-H 'X-Api-Token: ${obj.apikey}'`,
      "-H 'Content-Type: application/json'",
      `-d '${json_body}'`,
      `'${url}'`,
    ];
    return cmd.join(' ');
  }

  static set_curl(details) {
    const curl_val = this.build_curl(details);
    this.logger('curl value', curl_val);
    $('#output-curl').val(curl_val);
    return this.set_curl_copy();
  }

  static build_body(obj) {
    let body;
    return (body = JSON.stringify(obj.body, null, 2));
  }

  static set_body(details) {
    const body_val = this.build_body(details);
    this.logger('body value', body_val);
    return $('#output-body').val(body_val);
  }

  static dom_to_obj() {
    const o = {
      eventtype: 'create',
      apikey: $('#input-apikey').val(),
      body: {
        event: {
          node: $('#input-node').val(),
          tag: $('#input-tag').val(),
          summary: $('#input-summary').val(),
          severity: parseInt($('#input-severity').val()),
        },
      },
    };
    return o;
  }

  static set_apikey_copy() {
    const apikey = $('#input-apikey option:selected').text();
    return $('#btn-copyapi').attr('data-clipboard-text', apikey);
  }

  static set_curl_copy() {
    const curl_command = $('#output-curl').val();
    return $('#btn-copycurl').attr('data-clipboard-text', curl_command);
  }
}
ApiConsole.initClass();

window.ApiConsole = ApiConsole;

// On load — after class definition because module scripts are deferred
$(function () {
  new Clipboard('.btn');

  ApiConsole.render();
  ApiConsole.handlers();
  ApiConsole.handler_output_change();
  ApiConsole.set_apikey_copy();

  return $('.output-builder').tooltip({
    tooltipClass: 'ui-tooltip-arrow-top',
  });
});
