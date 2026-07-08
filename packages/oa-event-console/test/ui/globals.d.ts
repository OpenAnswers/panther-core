//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
// Type declarations for globals exposed by the concat + testGlobalExpose plugins.
// These classes are defined as bare declarations in the source files and made
// available on globalThis for tests.

/* eslint-disable no-var */

// _scripts.ts chain
declare var DomErrorBase: any;
declare var DomError: any;
declare var DomWarning: any;
declare var DomErrorSet: any;
declare var Module: any;
declare var Helpers: any;
declare var Timer: any;
declare var Form: any;
declare var Message: any;
declare var Notification: any;
declare var Rendered: any;
declare var RenderedSave: any;
declare var Logging: any;
declare var Browser: any;

// _rules-management.ts chain
declare var Data: any;
declare var UI: any;
declare var TemplatesNo: any;
declare var RuleVerbBase: any;
declare var RuleVerbTypes: any;
declare var RuleVerbSet: any;
declare var ActionBase: any;
declare var ActionDiscard: any;
declare var ActionSet: any;
declare var ActionStop: any;
declare var ActionStopRuleSet: any;
declare var ActionReplace: any;
declare var ActionTypes: any;
declare var Actions: any;
declare var OptionBase: any;
declare var OptionDebug: any;
declare var OptionSkip: any;
declare var OptionTypes: any;
declare var Options: any;
declare var SelectBase: any;
declare var SelectAll: any;
declare var SelectNone: any;
declare var SelectMatch: any;
declare var SelectEquals: any;
declare var SelectFieldExists: any;
declare var SelectFieldMissing: any;
declare var SelectStartsWith: any;
declare var SelectEndsWith: any;
declare var SelectLessThan: any;
declare var SelectGreaterThan: any;
declare var SelectSchedule: any;
declare var SelectTypes: any;
declare var Selects: any;
declare var Group: any;
declare var Groups: any;
declare var Rule: any;
declare var GroupRule: any;
declare var GroupRuleSelect: any;
declare var RuleSet: any;
declare var RuleGroup: any;
declare var RuleNew: any;
declare var ActionFilters: any;
declare var EventRules: any;

declare var GenericInputGroup: any;
declare var GenericInputLabelValue: any;
declare var GenericInputLabelValues: any;
declare var GenericInputFieldValue: any;
declare var GenericInputFieldValues: any;
declare var GenericInputLabelEnum: any;
declare var GenericInputLabelEnums: any;
declare var GenericInputFieldEnum: any;
declare var GenericInputFieldEnums: any;
declare var GenericInputFieldEnumsArray: any;

// Vendor globals
declare var debug: any;
declare var _: any;
declare var $: any;
declare var jQuery: any;
declare var Mustache: any;
