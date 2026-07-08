// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
// EventRules Management Class
// =====================

// This class handles the complete set of data for each
// Type of EventRule. Provides a single interface to
// Access the data and do global things like "render"

//     EventRulesServer
//       Groups Group RuleSet
//       Global RuleSet
//     EventRulesHttp
//       AgentRules
//       RuleSet
//     EventRulesGraylog
//       AgentRulesSyslog
//       RuleSet
//     EventRulesSyslog
//       AgentRulesSyslog
//       RuleSet

// -------------------------------------------------------
// ## Class EventRules

// Needs a page with an #event_rules container and it will
// take it from there

var EventRules = (function () {
  let appendAllRules = undefined;
  EventRules = class EventRules {
    static initClass() {
      this.debugNamespace = 'oa:event:rules:eventrules';
      this.logger = debug(`${EventRules.debugNamespace}`);

      // A store for the inited rules so html based events
      // can or external things can look up via type/subtype
      this.store = {};

      // `appendAllRules()`
      appendAllRules = function () {
        throw new Error('appendAllRules() not implemented');
      };
    }

    static init(type, sub_type) {
      const event_rules = (() => {
        switch (Data.whichRulesPage()) {
          case 'groups':
            return new EventRulesServerGroupsView();
          case 'globals':
            return new EventRulesServerGlobalView();
          case 'agents':
            switch (sub_type) {
              case 'http':
                return new EventRulesAgentHttp();
              case 'syslogd':
                return new EventRulesAgentSyslogd();
              case 'graylog':
                return new EventRulesAgentGraylog();
              default:
                return Message.error(`No agent type [${sub_type}] to render `);
            }
          default:
            return Message.error(`No rules type to render ${Data.whichRulesPage()}`);
        }
      })();

      event_rules.render();
      return event_rules;
    }

    // Detect the event rules type from the yaml object passed in
    // Generate client event rules from yaml structure
    static generate(yaml_obj, options) {
      EventRules.logger('generating from yaml object', yaml_obj, options);

      // Check if we are an agent
      if (yaml_obj.agent) {
        switch (yaml_obj.agent.type) {
          case 'http':
            return EventRulesAgentHttp.generate(yaml_obj, options);
          case 'syslogd':
            return EventRulesAgentSyslogd.generate(yaml_obj, options);
          case 'graylog':
            return EventRulesAgentGraylog.generate(yaml_obj, options);
          default:
            throw new Error(`Unsupported agent type [${yaml_obj.agent.type}]`);
        }

        // Otherwise we are global and groups
      } else if (yaml_obj.globals && yaml_obj.groups) {
        if (Data.sub_type === 'globals') {
          return EventRulesServerGlobalView.generate(yaml_obj, options);
        } else if (Data.sub_type === 'groups') {
          return EventRulesServerGroupsView.generate(yaml_obj, options);
        } else {
          throw new Error("Don't have a server view to render");
        }
      } else {
        throw new Error('Unknown yaml data structure');
      }
    }

    // `new EventRules`
    // This should be called, its for the child classes to use
    constructor(options, execute) {
      options ??= {};
      execute ??= true;
      if (execute === true) {
        this.event_rules_init(options);
      }
    }

    event_rules_init(options) {
      options ??= {};
      this.logger ??= this.constructor.logger;

      this.type ??= this.constructor.type;
      if (!this.type) {
        throw new Error('new property `type` must be set');
      }

      this.sub_type ??= this.constructor.sub_type;
      if (!this.type) {
        throw new Error('new property `sub_type` must be set');
      }

      //@rule_set ?= options.rule_set or new RuleSet
      //event_rules: @

      this.container_id ??= options.container_id;
      this.container_selector = '#' + this.container_id;

      this.$container = options.$container;
      if (!this.$container || !(this.$container.length > 0)) {
        throw new Error();
      }

      // Server Data for type
      this.data ??= options.data;

      this.yaml = options.yaml;
      if (this.yaml) {
        this.build_from_yaml();
      }

      return this.initial_handlers();
    }

    // Promise a socketio message
    socketio_Async(route, data, options) {
      const self = this;
      this.logger('socketio_Async starting %s', route, data, options);
      return new Promise(function (resolve, reject) {
        $('.request-spinner').removeClass('hidden');

        const msg = {
          type: self.type,
          sub_type: self.sub_type,
        };

        if (options && options.group != null) {
          msg.group = options.group;
        }
        msg.data = data;

        if (!msg.data) {
          reject(new Error('Update socket message requires data to send'));
        }

        self.logger('socketio_Async sending %s', route, msg);
        return socket.emit(route, msg, function (err, response) {
          if (err) {
            console.error('Problem with message [%s]', route, msg, err);

            // So socket errors are serialised as plain objects
            // Server side Error classes are replicated in the client
            // We lookup the `name` an recreate the error class
            // Bluebird likes to have real errors....
            reject(ErrorType.from_object(err));
          }

          self.logger('got response to [%s]', route, response);
          return resolve(response);
        });
      }).finally(() => $('.request-spinner').addClass('hidden'));
    }

    // -------------------
    // `.refresh_Async()
    // Trigger refresh up the chain until the data source is
    // refreshed. Single Rules can't be refreshed on their own
    // at the moment
    refresh_Async(options) {
      options ??= {};
      const self = this;
      return new Promise((resolve, reject) =>
        self
          .socketio_Async('event_rules::read', {}, options)
          .then(function (results) {
            self.logger('Setting new yaml', _.keys(results));
            self.yaml = results;
            self.build_from_yaml();
            self.render();
            self.enable_sortable();
            return resolve(results);
          })
          .catch(error => reject(error))
      );
    }

    // `render()`
    render() {
      throw new Error('render() not implemented');
    }

    // -----------------------------------------------------
    // `getContainerElement()` returns a jquery ref to the main
    // page event rules container.
    getContainerElement() {
      return this.$container;
    }

    // -----------------------------------------------------
    // `createNewRule()`
    createNewRule() {
      return this.rule_set.createNewRule();
    }

    // -----------------------------------------------------
    // `enable_sortable()`
    enable_sortable() {
      return this.rule_set.enable_sortable();
    }

    // -----------------------------------------------------
    // `disable_sortable()`

    disable_sortable() {
      return this.rule_set.disable_sortable();
    }

    collapse_all(flag) {
      return this.rule_set.collapse_all(flag);
    }

    doSearchAndFilter() {
      return this.rule_set.doSearchAndFilter();
    }

    searchWarning() {
      const searchWarning = $('#search-warning');
      if ($('#sidebar-search-box').val() !== '' || ActionFilters.actionFilters.length > 0) {
        return searchWarning.show();
      } else {
        return searchWarning.hide();
      }
    }

    deploy_Async() {
      const self = this;
      return this.socketio_Async('event_rules::save', {});
    }

    discard_Async() {
      const self = this;
      return this.socketio_Async('event_rules::discard_changes', {});
    }

    initial_handlers() {
      const self = this;

      // Confirm deploy
      $('.navbar-nav .nav-quick-deploy .btn-success')
        .off('click')
        .on('click', function () {
          self.logger('deploy/save clicked');
          return self.deploy_Async().then(function () {
            self.refresh_Async();
            self.render();
            return UI.hideSaveRulesDialog();
          });
        });

      // Cancel deploy
      $('.navbar-nav .nav-quick-deploy .btn-danger')
        .off('click')
        .on('click', function () {
          self.logger('deploy/discard clicked');
          return self
            .discard_Async()
            .then(function () {
              self.refresh_Async();
              self.render();
              return self.collapse_all();
            })
            .then(() => UI.hideSaveRulesDialog());
        });

      socket.on('event_rules::reloaded', function (data) {
        $('#modal-reload-rule').modal({ backdrop: 'static', keyboard: false });
        // hide the save dialog
        return UI.hideSaveRulesDialog();
      });

      socket.on('event_rules::edited', function (data) {
        Message.info('Rules have been edited, Deploy when ready');
        return UI.showSaveRulesDialog();
      });

      //handleClearFiltersAndSearch: ->
      $('#search-clear-button').click(function () {
        ActionFilters.removeAllActionFilters();
        $('#sidebar-search-box').val('');
        return Data.event_rules.doSearchAndFilter();
      });

      //handleSearchChange: ->
      $('#sidebar-search-box').on('keyup', ev => self.doSearchAndFilter());

      //handleSidebarFilterClick = ->
      $('.sidebar .tags .entry')
        .off('click')
        .on('click', function () {
          ActionFilters.toggleTag($(this));
          return Data.event_rules.doSearchAndFilter();
        });

      // stop text selection on quick clicking of buttons
      return $('#event-rules .buttons').disableSelection();
    }
  };
  EventRules.initClass();
  return EventRules;
})();

// -----------------------------------------------------
// ## Class EventRulesServer

let Cls = (this.EventRulesServer = class EventRulesServer extends EventRules {
  static initClass() {
    this.logger = debug('oa:event:rules:event_rules_server');
    this.type = 'server';
  }

  static generate(yaml_obj, options) {
    options ??= {};
    EventRulesServer.logger('generating', yaml_obj);
    const event_rules_server = new EventRulesServer();
    event_rules_server.eventrules_server_init();
    return event_rules_server;
  }

  constructor() {
    super({}, false);
  }

  eventrules_server_init(options) {
    options ??= {};
    this.container_id ??= 'event-rules-server';
    this.logger ??= this.constructor.logger;
    this.groups = options.groups || new Groups({ event_rules: this });
    return this.event_rules_init(options);
  }

  deploy() {
    throw new Error('Do some servery socketio stuff');
  }

  render() {
    this.$container.append(this.rule_set.render());
    return this.$container.append(this.groups.render());
  }

  getGroup(group) {
    return (
      groups[group] ||
      (() => {
        throw new Error(`No group [${group}]`);
      })()
    );
  }
});
Cls.initClass();

// -------------------------------------------------------
// ## Class EventRulesServerGlobalView

// Unfortunatey Server Rules are split across two pages
// So we need a custom view for each page
class EventRulesServerGlobalView extends EventRulesServer {
  static initClass() {
    this.logger = debug('oa:event:rules:event_rules_server_globals');
    this.sub_type = 'globals';
  }

  static generate(yaml_def, options) {
    options ??= {};
    this.logger('generating', yaml_def);

    options.yaml = yaml_def;
    return new this(options);
  }

  // `new EventRulesServerGlobalView {}`
  constructor(options) {
    options ??= {};
    super();
    this.logger = this.constructor.logger;
    this.container_id = 'event-rules-server-globals';
    this.eventrules_server_init(options);
  }

  // ###### @build_from_yaml( yaml_Object )
  build_from_yaml(yaml_def) {
    // Create the event rules
    yaml_def ??= this.yaml;
    let $rule_set = this.$container.find('ul');
    if ($rule_set.length < 1) {
      const $cont = $('<ul/>');
      this.$container.append($cont);
      $rule_set = $cont;
    }

    this.rule_set = RuleSet.generate(yaml_def.globals.rules, {
      $container: $rule_set,
      type: this.type,
      sub_type: this.sub_type,
      event_rules: this,
    });

    return this.logger('build from yaml');
  }

  // ###### @render()
  // We don't extend `Rendered` here so add a custom
  // render for consistancy
  render() {
    this.$container.html('');
    this.$container.append(this.rule_set.render());
    return this.$container;
  }

  // ###### initial_handlers()
  initial_handlers() {
    super.initial_handlers();
    const self = this;

    $(document)
      .off('click.global-create')
      .on('click.global-create', '.btn-rules-global-create-rule', function (ev) {
        self.logger('click .btn-rules-global-create-rule');
        self.createNewRule();
        return window.scrollTo(0, document.body.scrollHeight);
      });
    return this.setCounters();
  }

  setCounters() {
    let updating;
    const values = {};
    let rule_hits = 0;
    let rule_counter = this.rule_set.rules.length;

    // iterate through all rules to increment rule_counter and rule_hits
    for (var rule in this.rule_set.rules) {
      rule_hits += this.rule_set.getRule(rule).uuid_tally;
      if (this.rule_set.getRule(rule).$container.hasClass('no-match')) {
        rule_counter--;
        rule_hits -= this.rule_set.getRule(rule).uuid_tally;
      }
    }

    // executes if a search is underway
    if (ActionFilters.actionFilters.length > 0 || $('#sidebar-search-box').val() !== '') {
      values.totalRulesMatched = rule_counter;
      values.matchedHitsCounter = rule_hits;
      updating = true;
    } else {
      values.totalRulesCounter = rule_counter;
      values.totalHitsCounter = rule_hits;
    }

    // rendering in the html for the counters
    const totalInfo = $('#template-total-global-info').html();
    const updatedTotalInfo = Mustache.render(totalInfo, values);
    $('#total-counter-info').html(updatedTotalInfo);
    if (updating) {
      $('#total-counter-info > .matched').removeClass('hidden');
      $('#total-counter-info > .plain').addClass('hidden');
    }
    if (rule_counter === 0) {
      return $('#rules-empty').show();
    } else {
      return $('#rules-empty').hide();
    }
  }

  doSearchAndFilter() {
    this.rule_set.doSearchAndFilter();
    if (ActionFilters.actionFilters.length > 0) {
      ActionFilters.renderActionFilter();
    }

    this.setCounters();
    return Data.event_rules.searchWarning();
  }
}
EventRulesServerGlobalView.initClass();

//update counters for rules matching search term
// @update_matches()
// @update_counter()
// @searchWarning()

// appendGlobalRules: ->
//   # It's global rules
//   for rule, index in Data.globalRules
//     ruleElem = Rule.generate rule, index
//     @rule_set.appendRule ruleElem, "none", true

// -------------------------------------------------------
// ## Class EventRulesServerGroupsView

// Unfortunatey Server Rules are split across two pages
// So we need a custom view for the each page
Cls = this.EventRulesServerGroupsView = class EventRulesServerGroupsView extends EventRulesServer {
  static initClass() {
    this.logger = debug('oa:event:rules:event_rules_server_groups');
    this.sub_type = 'groups';
  }

  static generate(yaml_def, options) {
    let event_rules;
    options ??= {};
    EventRulesServerGroupsView.logger('generating', yaml_def);

    const evr_options = _.defaults({ yaml: yaml_def }, options);
    evr_options.$container = options.$container || $('#event-rules');

    return (event_rules = new EventRulesServerGroupsView(evr_options));
  }

  // `new EventRulesServerGroupsView options_Object`
  constructor(options) {
    options ??= {};
    super();
    this.logger = this.constructor.logger;
    this.eventrules_server_init(options);
    this.container_id = 'event-rules-server-globals';
  }

  build_from_yaml(yaml_def) {
    yaml_def ??= this.yaml;
    this.logger('building groups', _.keys(yaml_def.groups).join(','));
    return (this.groups = Groups.generate(yaml_def.groups, { event_rules: this }));
  }

  // ###### @collapse_all()
  // Override collapse all as we don't have a `rule_set`
  collapse_all(flag) {
    return this.groups.collapse_all(flag);
  }

  render() {
    const $gr = this.groups.render();
    this.setCounters(false);
    this.logger(
      'Rendering groups to container - [%s]',
      _.keys(this.groups.groups).length,
      this.$container,
      this.groups.$container,
      $gr
    );
    this.$container.html('');
    this.$container.append($gr);
    return this.$container;
  }

  static createNewRule(group) {
    return getGroup(group).rule_set.createNewRule(group);
  }

  //# ###### appendGroup( group_name )
  //appendGroup: (groupName) ->
  //rulesContainer = $("#rules-sortable")
  //$(ruleElem).appendTo $(rulesContainer)

  // ###### @enable_sortable()
  enable_sortable() {
    this.groups.enable_extra_sortable();
    return this.groups.enable_sortable();
  }

  // ###### @disable_sortable()
  disable_sortable() {
    return this.groups.disable_sortable();
  }

  // override base method for groups
  doSearchAndFilter() {
    // iterate over every group, apply search term along with action filter
    this.groups.each_group(function (group) {
      group.rule_set.doSearchAndFilter();
      if (ActionFilters.actionFilters.length > 0) {
        ActionFilters.renderActionFilter();
      }

      //update counters for rules matching search term
      group.update_matches();

      //update total counter for all groups
      group.update_group_total_counters();

      if (group.ruleMatches === 0) {
        return group.hide_group();
      }
    });

    // updating counters against search results
    this.setCounters();

    // updating the search warning
    return Data.event_rules.searchWarning();
  }

  setCounters() {
    // object that will be rendered into html
    let ruleCount, ruleMatches, updating;
    const values = {};

    //checker for initial setup or updating current counters
    if (ActionFilters.actionFilters.length > 0 || $('#sidebar-search-box').val() !== '') {
      updating = true;
    }

    // if counters are being updated for a search term
    if (updating) {
      let group_matched_counter = 0;
      ruleMatches = 0;

      // iterate over each group, count total rule and group matches
      this.groups.each_group(function (group) {
        if (group.ruleMatches !== 0) {
          group_matched_counter++;
          return (ruleMatches += group.ruleMatches);
        }
      });

      values.totalGroupRulesCounter = ruleMatches;
      values.totalGroupsCounter = group_matched_counter;

      // if counters are not being updated against a search term
    } else {
      ruleCount = 0;
      this.groups.each_group(function (group) {
        ruleCount += group.ruleCount;
        return group.update_group_total_counters();
      });

      values.totalGroupsCounter = this.groups.store_order.length;
      values.totalGroupRulesCounter = ruleCount;
    }

    // html that will be rendered in for the total couters of the group page
    const totalInfo = $('#template-total-group-info').html();
    const updatedTotalInfo = Mustache.render(totalInfo, values);
    $('#total-counter-info').html(updatedTotalInfo);
    if (updating) {
      $('#total-counter-info > .matched').removeClass('hidden');
      $('#total-counter-info > .plain').addClass('hidden');
    }

    if (ruleMatches === 0 || ruleCount === 0) {
      return $('#rules-empty').show();
    } else {
      return $('#rules-empty').hide();
    }
  }
};
Cls.initClass();

window.EventRulesServerGlobalView = EventRulesServerGlobalView;
