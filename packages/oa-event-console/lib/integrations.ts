
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// logging
const { logger, debug } = require('oa-logging')('oa:event:rules:action');

// npm modules
const mongoose = require('mongoose');
const moment   = require('moment');
// HTTP client: use Node's global fetch (available from Node 18+). This file
// used to depend on the deprecated `request` library (see git history); the
// switch keeps the code shape identical — `fetch(url)` then
// `response.status` — so existing callers of HttpIntegration.run() don't
// need to change, though response-body consumption (if anyone ever wires it
// up) should use `await response.text()`/`.json()`.

// oa modules
const Errors   = require('./errors');

const IntegrationLog = require('../app/model/integration_log');

const { _,
  throw_error,
  format_string } = require('oa-helpers');


// ## Class: Integration
// A single Integration to extend
class Integration {

  static description() {
    throw new Errors.NotImplementedError('description not implemented');
  }

  // ###### run( event )
  // Every integration needs to run on an event
  run( event, ...args: any[] ): any {
    throw new Errors.NotImplementedError('run is not defined');
  }

  // ###### replace_fields( str, event )
  // search in str `{field}` and replace it with the data in `event`
  replace_fields( str, event ){
    return format_string(str, event);
  }
}



// ## Class: HttpIntegration
// The generic HTTP Integration
class HttpIntegration extends Integration {
  static methods: any;
  url: any; method: any; header: any; body: any;

  static initClass() {
    
    // Selected methods we support
    this.methods = [ 'GET', 'POST', 'PUT', 'DELETE' ];
  }

  // The web descriptor
  static description(): any { return {
    name: 'HTTP Request',
    input: [{
      name:         'method',
      label:        'Method',
      type:         'select',
      values:       this.methods
    },{
      name:         'url',
      label:        'URL',
      type:         'text',
      validation:   '' //some URL.js function
    },{
      name:         'header',
      label:        'Header',
      type:         'text'
    },{
      name:         'body',
      label:        'Body',
      type:         'textarea'
    }]
  }; }

  constructor( url, options ){
    super();
    this.url = url;
    this.method   = options.method ?? 'GET';
    //@headers  = options.headers ? []
    this.header   = options.header;
    this.body     = options.body ?? '';
    this.url      = options.url;
  }

  
  // Send the http request
  run( event, cb ): any {
    const url  = this.replace_fields(event, this.url);
    const body = this.replace_fields(event, this.body);

    return fetch( url )
    .then(function( response ){
      if (response.status !== 200) {
        cb(`error: ${response.status}`);
      }

      logger.info('integration', response);
      //log = new IntegrationLog

      if (cb) { return cb(null, response); }}).catch(function( error ){
      logger.error('error in integration request', error, '');
      return cb(error);
    });
  }
}
HttpIntegration.initClass();



// ## Class: SesIntegration
// The SES Amazon email Integrations
class SesIntegration extends HttpIntegration {
  auth_aws_key: any; email_destination: any; subject: any;

  // The web descriptor
  static description() { return {
    name: 'Amazon SES Email',
    input: [{
      name:         'name',
      label:        'Name',
      type:         'text',
      placeholder:  'This name will appear in the context menu',
      validation:   /^[\w\s]+$/
    },{
      name:         'auth_aws_key',
      label:        'Access Key',
      type:         'text',
      placeholder:  'Token or Password'
    },{
      type:         'divider',
      label:        'Ticket Settings'
    },{
      name:         'email_destination',
      label:        'Destination address',
      type:         'text',
      placeholder:  'email-to@domain.com'
    },{
      name:         'subject',
      label:        'Subject',
      type:         'text',
      placeholder:  'Subject {fields}'
    },{
      name:         'body',
      label:        'Body',
      type:         'textarea',
      placeholder:  'Body with event {fields}'
    }]
  }; }

  constructor( url, options ){
    super(url, options);
    this.auth_aws_key      = options.auth_aws_key;
    this.email_destination = options.email_destination;
    this.subject           = options.subject;
    this.body              = options.body;
  }

  run( event, cb ){
    const subject = this.replace_fields(this.subject, event);
    const body    = this.replace_fields(this.body, event);
    // build and send api request
  }
}

    // build and send api request



// ## Class: ZendeskTicketIntegration
// The Zendesk Ticket Integrations
class ZendeskTicketIntegration extends HttpIntegration {
  static ticket_types: any;
  static ticket_priorities: any;
  name: any; subdomain: any; email: any; auth_password: any; auth_token: any;
  ticket_type: any; ticket_priority: any; ticket_subject: any; ticket_comment: any;

  static initClass() {
  
    this.ticket_types = [ 'Incident', 'Problem', 'Question', 'Task' ];
  
    this.ticket_priorities = [ 'Urgent', 'High', 'Normal', 'Low' ];
  }

  // The web descriptor
  static description() { return {
    name: 'ZenDesk Ticket',
    input: [{
      name:         'subdomain',
      label:        'Subdomain',
      type:         'text',
      aftertext:    '.zendesk.com',
      placeholder:  'your_domain',
      validation:   /[^\s_]/
    },{
      name:         'email',
      label:        'Email',
      type:         'email',
      placeholder:  'email@domain.com'
    },{
      name:         'auth',
      label:        'Authentication',
      type:         'select_string',
      types:        [ 'Token', 'Password' ],
      placeholder:  'Token or Password'
    },{
      type:         'divider',
      label:        'Ticket Settings'
    },{
      name:         'ticket_type',
      label:        'Type',
      type:         'select',
      values:       this.ticket_types
    },{
      name:         'ticket_priorities',
      label:        'Priority',
      type:         'select',
      values:       this.ticket_priorities
    },{
      name:         'ticket_subject',
      label:        'Subject',
      type:         'text',
      placeholder:  'Subject with event {fields}'
    },{
      name:         'ticket_comment',
      label:        'Comment',
      type:         'textarea',
      placeholder:  'Comment with event {fields}'
    }]
  }; }

  constructor( name, options ){
    super(null, options);
    this.name = name;
    this.subdomain       = options.subdomain;
    this.email           = options.email ?? [];
    this.auth_password   = options.password ?? '';
    this.auth_token      = options.token ?? '';
    this.ticket_type     = options.type ?? '';
    this.ticket_priority = options.priority ?? '';
    this.ticket_subject  = options.subject ?? '';
    this.ticket_comment  = options.comment ?? '';
  }

  run( event, cb ){
    const comment  = this.replace_fields(this.ticket_comment, event);
    const subject  = this.replace_fields(this.ticket_subject, event);
    // build and send api request
  }
}
ZendeskTicketIntegration.initClass();

    // build and send api request



// ## Class: HttpRedirectIntegration
// The generic HTTP redirect Integration
// Sends the user to a page with some sort of event context
class HttpRedirectIntegration extends Integration {
  url: any;

  static description() { return {
    name: 'HTTP Redirect',
    input: [{
      name:         'url',
      label:        'URL',
      type:         'text',
      placeholder:  'Redirect URL {fields}'
    }]
  }; }

  constructor( url ){ super(); this.url = url; }

  run( event, cb ){
    // not sure how to inject this one into the client
    // maybe a js window.location?
    const url = this.replace_fields(this.url, event);
    return cb(null, {location: `${url}`});
  }
}



// ## CreateNewRuleIntegration
// The internal Create New Rule
class CreateNewRuleIntegration extends HttpRedirectIntegration {

  static description() { return {
    name: 'HTTP Redirect',
    input: []
  }; }

  constructor( url ){ super(url); }

  run( event, cb ){
    // redirect user to http address
    return cb(null, {location: `/rules/create?id=${event.id}`});
  }
}



// ## Class: Integrations
// A cluster of Integrations
class Integrations {
  static types: any;
  static types_default_inputs: any;
  static types_description: any;

  static initClass() {
  
    // Types of integration, with class
    this.types = {
      http:           HttpIntegration,
      zendesk_ticket: ZendeskTicketIntegration,
      ses:            SesIntegration,
  //    sns:            SnsIntegration
      http_redirect:  HttpRedirectIntegration,
      create_rule:    CreateNewRuleIntegration
    };
  
  
    // Default inputs for all integration types
    this.types_default_inputs = [{
      name:         'name',
      label:        'Name',
      type:         'text',
      placeholder:  'This name will appear in the context menu',
      validation:   /^[\w\s]+$/
    }];
  
  
    // Holds a description of all configured types of Integration
    // Require a @description() function from each class
    this.types_description = {};
    for (var type in this.types) {
      var klass = this.types[type];
      this.types_description[type] = klass.description();
      this.types_description[type].input.unshift(...this.types_default_inputs || []);
    }
  }


  // ###### types_list
  // Return an array of Integration types
  static types_list() {
    return _.keys(this.types);
  }


  // ###### build_mongoose_models()
  // Create a mongoose model from an Integrations decscription
  build_mongoose_models(){
    return (() => {
      const result = [];
      for (var type in Integrations.types) {
        throw_error("build_model not implemented", type);
      }
      return result;
    })();
  }


  // ###### build_mongoose_model()
  // Create a mongoose model from an Integrations decscription
  build_mongoose_model(){

    return (() => {
      const result = [];
      for (var name in Integrations.types_description) {
        var definition = Integrations.types_description[name];
        debug('processing field of description', name);

        var schema = new mongoose.Schema;

        switch (name) {
          case 'divider': continue; break;

          case 'string': case 'select_string': case 'email': case 'select': case 'text': case 'textarea':
            schema['integration'][name]['type'] = String;
            break;

          default:
            throw_error("Unknown integration field type", definition.type);
        }

        schema['integration'][name]['required'] = (definition.required != null) === false ?
          false
        :
          true;

        result.push(schema);
      }
      return result;
    })();
  }
}
Integrations.initClass();

      

module.exports = {
  Integrations,
  Integration,
  HttpIntegration,
  ZendeskTicketIntegration,
  HttpRedirectIntegration,
  CreateNewRuleIntegration
};
