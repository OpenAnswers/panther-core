//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// # Activities

// As this is a web system we need a place to log system activity that users
// can subscribe to a feed, query or audit at a later date.

// Events are the only activity category in use so far, this is what populate
// the activity stream on the dashboard and sidebar


// logging
const { logger, debug } = require('oa-logging')('oa:event:activity');

// node modules
const util              = require('util');

// npm modules
const Promise: any      = require('bluebird');
const mongoose          = require('mongoose');
const moment            = require('moment');

// oa modules
const Errors            = require('./errors');
const { Activity }      = require('../app/model/activity');
const { _,
  format_string_object,
  throw_error }   = require('oa-helpers');


// ## Class Activities

class Activities {
  static types: any;
  static history: any;

  static initClass() {
  
    // `@types` holds inforomation on all the different activity types
  
    this.types = {
      event: {
  
        assign: {
          message: '{username} assigned {metadata.ids} to {metadata.owner}'
        },
  
        clear: {
          message: '{username} cleared {metadata.ids}'
        },
  
        'delete-all': {
          message: '{username} deleted all events'
        },
  
        'delete': {
          message: '{username} deleted {metadata.ids}'
        },
  
        'external_id': {
          message: '{username} added an external_id {metadata.external_id}'
        },
  
        severity: {
          message: '{username} changed {metadata.ids} severity to {metadata.severity}'
        },
  
        acknowledge: {
          message: '{username} acknowledged {metadata.ids}'
        },
  
        unacknowledge: {
          message: '{username} unacknowledged {metadata.ids}'
        }
      },
  
  
      user: {
  
        create: {
          message: '{username} added new user {metadata.username}'
        },
  
        'delete': {
          message: '{username} removed new user {metadata.username}'
        },
  
        update: {
          message: '{username} updated the user {metadata.username}'
        },
  
        reset: {
          message: '{username} reset {metadata.username}\'s password'
        },
  
        login: {
          message: '{username} logged in'
        },
  
        login_failed: {
          message: '{username} log in failed'
        },
  
        logout: {
          message: '{username} logged out'
        }
      },
  
  
      rules: {
  
        deploy: {
          message: '{username} deployed the {metadata.type} changes'
        },
  
        discard: {
          message: '{username} discarded the {metadata.type} changes'
        },
  
        create: {
          message: '{username} created a new {metadata.type} rule "{metadata.name}"'
        },
  
        'delete': {
          message: '{username} deleted the {metadata.type} rule "{metadata.name}"'
        },
  
        update: {
          message: '{username} modified the {metadata.type} rule "{metadata.name}"'
        },
  
        agent_update: {
          message: '{username} modified {metadata.type}\'s "{metadata.name}"'
        },
  
        group_update: {
          message: '{username} modified the {metadata.type} "{metadata.name}"'
        },
  
        group_create: {
          message: '{username} created the {metadata.type} "{metadata.name}"'
        },
  
        group_delete: {
          message: '{username} deleted the group "{metadata.name}"'
        },
  
        group_select: {
          message: '{username} modified the {metadata.type} select for "{metadata.name}"'
        },
  
        imported: {
          message: '{username} imported rules'
        }
      },
  
      apikey: {
  
        create: {
          message: '{username} created an API key'
        },
  
        'delete': {
          message: '{username} deleted an API key'
        }
      },
  
  
      certificate: {
  
        create: {
          message: '{username} created a certificate for "{metadata.name}"'
        },
  
        'delete': {
          message: '{username} deleted the certificate for "{metadata.name}"'
        }
      },
  
  
      integration: {
  
        create: {
          message: '{username} created a {metadata.type} integration'
        },
  
        'delete': {
          message: '{username} deleted the {metadata.type} integration "{metadata.name}"'
        },
  
        update: {
          message: '{username} modified the {metadata.type} integration "{metadata.name}"'
        }
      },
  
  
      provision: {
  
        create: {
          message: 'The "{metadata.name}" event console was created'
        }
      }
    };
  
    // History is the activity logging inside an event
  
    this.history = {
      acknowledge: {
        message: 'Acknowleged'
      },
      unacknowledge: {
        message: 'Unacknowledged'
      },
      assign: {
        message: 'Assigned to %s',
        fields: [ 'owner' ]
      },
      severity: {
        message: 'Changed severity to %s',
        fields: [ 'severity' ]
      },
      clear: {
        message: 'Cleared event'
      },
      external_id: {
        message: 'Changed external ID to %s',
        fields: [ 'external_id' ]
      }
    };
  }


  // ###### store( activity_type, name, metadata )
  
  // Promise to store an activity in the database
  // Allows you to control the return and catch more directly
  static store_Async( category, type, username, metadata ){
    const self = this;
    return new Promise(function( resolve, reject ){
      if (self.types[category] == null) {
        throw_error("No category", category);
      }

      if (self.types[category][type] == null) {
        throw_error("No type in category", category, type);
      }

      const db_type = self.types[category][type];

      const activity = new Activity({
        username,
        metadata,
        category,
        type
      });
        //message:
          //text: message

      activity.message.text = db_type && db_type.message ?
        format_string_object(self.types[category][type].message, activity) : undefined;

      debug('Saving new activity to db', activity);

      return activity.save()
      .then(result => resolve(result)).catch(function( error ){
        logger.error('There was an error saving activity cat[%s] type[%s] user[%s]',
          category, type, username, metadata, error, error.stack);
        return reject(error);
      });
    });
  }


  // Store an activity in the database
  // Manages the catch and logging for you
  static store( category, type, username, metadata ){

    return this.store_Async( category, type, username, metadata )
    .then(results => debug('Activity saved to db', results)).catch(error => logger.error('Error saving activity to the db',
      category, type, username, metadata, error.message, error.stack));
  }


  // Store an event activity in the database
  static store_event( type, username, metadata ){
    return this.store('event', type, username, metadata);
  }


  // ###### type_to_history_text( type, set_fields )

  // We need to log some information for each update type
  // All messages for the types are stored here and looked up via their name.
  // `fields` will be used for any %s string replacements (via urtil.format)

  // `type` - the type of message to create
  // `set_fields` - the data being set in this operation
  // Returns - A formatted message string

  static type_to_history_text( type, set_fields ){
    const format_vars = [];
    if (this.history[type].fields != null) {
      for (var name of this.history[type].fields as string[]) {
        format_vars.push(set_fields[name]);
      }
    }

    return util.format(this.history[type].message, ...format_vars);
  }
}
Activities.initClass();


module.exports =
  {Activities};
