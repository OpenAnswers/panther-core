//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect } = require('../../mocha_helpers');
const { Field } = require('../../../lib/field');

describe('Unit::EventConsole::lib::field', function() {

  describe('definition', function() {
    it('exposes the full set of event fields', function() {
      const list = Field.list();
      for (const key of ['node', 'severity', 'summary', 'group', 'owner', 'tally', 'first_occurrence']) {
        expect(list).to.include(key);
      }
    });

    it('labels() returns entries sorted by label', function() {
      const labels = Field.labels().map((f: any) => f.label);
      const sorted = [...labels].sort();
      expect(labels).to.deep.equal(sorted);
    });
  });

  describe('field_to_w2_column', function() {
    it('renames name→field and label→caption and strips priority/alias/help/view', function() {
      const col = Field.field_to_w2_column(Field.definition.node);
      expect(col.field).to.equal('node');
      expect(col.caption).to.equal('Node name');
      expect(col.size).to.equal('150px');
      expect(col).to.not.have.property('priority');
      expect(col).to.not.have.property('alias');
      expect(col).to.not.have.property('label_shrt');
      expect(col).to.not.have.property('help');
      expect(col).to.not.have.property('view');
    });

    it('applies w2_column_defaults (sortable, resizable) when absent', function() {
      const col = Field.field_to_w2_column(Field.definition.severity);
      expect(col.sortable).to.be.true;
      expect(col.resizable).to.be.true;
    });

    it('passes through percentage sizes unchanged', function() {
      const col = Field.field_to_w2_column(Field.definition.summary);
      expect(col.size).to.equal('90%');
    });
  });

  describe('w2BuildColumnDefinition', function() {
    it('builds a column def for every default field', function() {
      const defs = Field.w2BuildColumnDefinition();
      expect(defs).to.have.lengthOf(Field.w2_fields.length);
      for (const def of defs) {
        expect(def.field).to.be.a('string');
        expect(def.caption).to.be.a('string');
      }
    });

    it('throws for an unknown field name', function() {
      expect(() => Field.w2BuildColumnDefinition(['does_not_exist']))
        .to.throw(/No field/);
    });

    it('rejects unsafe field names that could smuggle JS into a w2ui eval', function() {
      // The existing definition doesn't contain this key, but patch it in to
      // exercise the safety gate without monkey-patching definition permanently.
      const prev = Field.definition['bad; evil()'];
      Field.definition['bad; evil()'] = { name: 'bad; evil()', type: 'String', size: 10 };
      try {
        expect(() => Field.w2BuildColumnDefinition(['bad; evil()']))
          .to.throw(/Unsafe w2ui field name/);
      } finally {
        if (prev === undefined) delete Field.definition['bad; evil()'];
      }
    });
  });

  describe('to_yaml / to_yaml_obj', function() {
    it('to_yaml_obj returns the definition object', function() {
      const f = new Field();
      expect(f.to_yaml_obj()).to.equal(Field.definition);
    });

    it('to_yaml produces a yaml string mentioning a known field key', function() {
      const f = new Field();
      const yaml = f.to_yaml();
      expect(yaml).to.be.a('string');
      expect(yaml).to.contain('node');
      expect(yaml).to.contain('severity');
    });
  });
});
