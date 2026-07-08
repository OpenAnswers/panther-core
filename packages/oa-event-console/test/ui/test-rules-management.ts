// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
// Test-only version of _rules-management.ts.
// Skips modules with DOM-ready side effects (main, event_rules, rule-new,
// actionfilters, typeaheads) that would trigger socket.io / AJAX in tests.
// Loaded via the concat plugin which inlines all imports into a shared scope.
import '../../app/assets/js/rules-management/data';
import '../../app/assets/js/rules-management/ui';
import '../../app/assets/js/rules-management/generic_input';
import '../../app/assets/js/rules-management/templates';
import '../../app/assets/js/rules-management/validation';
import '../../app/assets/js/rules-management/rule_verb_base';
import '../../app/assets/js/rules-management/rule_verb_types';
import '../../app/assets/js/rules-management/rule_verb_set';
import '../../app/assets/js/rules-management/action';
import '../../app/assets/js/rules-management/option';
import '../../app/assets/js/rules-management/select';
import '../../app/assets/js/rules-management/group';
import '../../app/assets/js/rules-management/groups';
import '../../app/assets/js/rules-management/rule';
import '../../app/assets/js/rules-management/rule_set';
import '../../app/assets/js/rules-management/rule_group';
