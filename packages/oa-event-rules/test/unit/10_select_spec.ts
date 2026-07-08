//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
const debug = require('debug')('oa:test:unit:rules:select');

const Errors = require('oa-errors');

const { expect } = require('../mocha_helpers');

const {
  Select,
  SelectAll,
  SelectMatch,
  SelectEquals,
  SelectFieldExists,
  SelectFieldMissing,
  SelectLessThan,
  SelectGreaterThan,
  SelectStartsWith,
  SelectEndsWith,
} = require('../../lib/select');

// So we can test events
const { Event } = require('../../lib/event');

describe('Select', function () {
  it('should have the types property', function (done: Function) {
    expect(Select.types).to.be.an.instanceof(Object);
    done();
  });

  it('class has types_description', function (done: Function) {
    expect(Select.types_description).to.be.an.instanceof(Object);
    done();
  });

  describe('.types property', function () {
    it('has the SelectAll type', function (done: Function) {
      expect(Select.types.all).to.equal(SelectAll);
      done();
    });

    it('has the SelectMatch type', function (done: Function) {
      expect(Select.types.match).to.equal(SelectMatch);
      done();
    });

    it('has the SelectEquals type', function (done: Function) {
      expect(Select.types.equals).to.equal(SelectEquals);
      done();
    });

    it('has the SelectFieldExists type', function (done: Function) {
      expect(Select.types.field_exists).to.equal(SelectFieldExists);
      done();
    });

    it('has the SelectFieldMissing type', function (done: Function) {
      expect(Select.types.field_missing).to.equal(SelectFieldMissing);
      done();
    });
  });

  describe('types description', function () {
    it('has the SelectAll description', function (done: Function) {
      const set_description = {
        name: 'all',
        input: [],
      };

      expect(Select.types_description.all).to.eql(set_description);
      done();
    });

    it('has the SelectMatch description', function (done: Function) {
      const match_description = {
        name: 'match',
        friendly_name: 'matches',
        description: 'Searches a field for a particular value. Regex is allowed.',
        help: 'This is a match field, it searches a string for a value',
        input: [
          {
            name: 'field',
            label: 'Field',
            type: 'string',
          },
          {
            name: 'value',
            label: 'string or /regex/',
            type: 'stregex',
            array: true,
          },
        ],
      };

      expect(Select.types_description.match).to.eql(match_description);
      done();
    });
  });

  describe('SelectMatch', function () {
    it('builds an object', function (done: Function) {
      //debug 'SelectMatch', SelectMatch
      const select_match_instance = new SelectMatch('fieldname', 'ovalue');
      expect(select_match_instance).to.be.an.instanceof(SelectMatch);
      done();
    });

    it('builds an object from types', function (done: Function) {
      const select_match_cls = Select.types.match;
      const select_match_ins = new select_match_cls('fieldname', 'tvalue');
      expect(select_match_ins).to.be.an.instanceof(SelectMatch);
      done();
    });

    it('generates an object from definition', function (done: Function) {
      const select_match_ins = Select.generate({
        match: {
          fieldname: 'value',
        },
      });
      expect(select_match_ins).to.be.an.instanceof(Select);
      expect(select_match_ins.run).to.exist;
      done();
    });

    it('error nicely on missing params to new', function (done: Function) {
      const fn = function () {
        return new SelectMatch();
      };
      expect(fn).to.throw('match The first paramater `field` must be defined');
      done();
    });

    it('error nicely on missing second value param to new', function (done: Function) {
      const fn = function () {
        return new SelectMatch('f');
      };
      expect(fn).to.throw('match The second paramater `value` must be defined');
      done();
    });

    it('throws when an array value contains an empty string', function () {
      expect(() => new SelectMatch('fieldname', ['ok', ''])).to.throw(Errors.ValidationError, /empty match/);
    });

    it('can run a match', function (done: Function) {
      const ev = Event.generate({ fieldname: 'mvalue' });
      const matcher = new SelectMatch('fieldname', 'mvalue');
      expect(matcher.run(ev)).to.equal(true);
      done();
    });

    it('can fail a match', function (done: Function) {
      const ev = Event.generate({ fieldname: 'nope' });
      const matcher = new SelectMatch('fieldname', 'mvalue');
      expect(matcher.run(ev)).to.equal(false);
      done();
    });

    it('can run a longer string search', function (done: Function) {
      const ev = Event.generate({ fieldname: 'yas yes yas' });
      const matcher = new SelectMatch('fieldname', 'yes');
      expect(matcher.run(ev)).to.equal(true);
      done();
    });

    it('can run a longer regex search', function (done: Function) {
      const ev = Event.generate({ fieldname: 'yes yes yes' });
      const matcher = new SelectMatch('fieldname', /yes/);
      expect(matcher.run(ev)).to.equal(true);
      done();
    });

    it('can run a stregex search', function (done: Function) {
      const ev = Event.generate({ fieldname: 'nope yes nope' });
      const matcher = new SelectMatch('fieldname', '/yes/');
      expect(matcher.run(ev)).to.equal(true);
      done();
    });

    it('can run a stregex array search', function (done: Function) {
      const ev = Event.generate({ fieldname: 'nope yes nope' });
      const matcher = new SelectMatch('fieldname', ['/yes/', '/nope/']);
      expect(matcher.run(ev)).to.equal(true);
      done();
    });

    it('had a label of match', function () {
      const matcher = new SelectMatch('fieldname', /yes/);
      expect(matcher.label).to.equal('match');
    });

    it('dumps the correct object back for regex', function () {
      const matcher = new SelectMatch('fieldname', /yes/);
      expect(matcher.to_yaml_obj()).to.eql({ match: { fieldname: /yes/ } });
    });

    it('dumps the correct object back string', function () {
      const matcher = new SelectMatch('fieldname', 'yes');
      expect(matcher.to_yaml_obj()).to.eql({ match: { fieldname: 'yes' } });
    });

    it('dumps the correct object back array', function () {
      const matcher = new SelectMatch('fieldname', ['yes', 'no', '/stregex/']);
      expect(matcher.to_yaml_obj()).to.eql({
        match: {
          fieldname: ['yes', 'no', '/stregex/'],
        },
      });
    });

    it('dumps a yaml string back', function () {
      const matcher = new SelectMatch('fieldname', 'yes');
      expect(matcher.to_yaml()).to.eql("match:\n  fieldname: 'yes'\n");
    });

    describe('Definitions', function () {
      it('can run from an object regex definition', function (done: Function) {
        const ev = Event.generate({ fieldname: 'value' });
        const matcher = Select.generate({
          match: {
            fieldname: /value/,
          },
        });
        expect(matcher.run(ev)).to.equal(true);
        done();
      });

      it('can run from a stregex definition', function (done: Function) {
        const ev = Event.generate({ fieldname: 'value' });
        const matcher = Select.generate({
          match: {
            fieldname: '/value/',
          },
        });
        expect(matcher.run(ev)).to.equal(true);
        done();
      });

      it('can run from a stregex definition', function (done: Function) {
        const ev = Event.generate({ fieldname: 'value' });
        const matcher = Select.generate({
          match: {
            fieldname: ['/value/', '/other/'],
          },
        });

        expect(matcher.run(ev)).to.equal(true);
        done();
      });

      it('can run from an object regex array definition', function (done: Function) {
        const ev1 = Event.generate({ this_field: 'value' });
        const ev2 = Event.generate({ this_field: 'talue' });
        const ev3 = Event.generate({ this_field: 'walue' });
        const matcher = Select.generate({
          match: {
            this_field: [/value/, /talue/],
          },
        });
        expect(matcher.run(ev1)).to.equal(true);
        expect(matcher.run(ev2)).to.equal(true);
        expect(matcher.run(ev3)).to.equal(false);
        done();
      });

      it('throws a validation error during generate', function (done: Function) {
        const fn = function () {
          return SelectMatch.generate('');
        };
        expect(fn).to.throw(Errors.ValidationError, /No selects could be built/);
        done();
      });

      it('throws when :match key is missing', function () {
        expect(() => SelectMatch.generate({})).to.throw(Errors.ValidationError, /Definition needs :match key/);
      });

      it('throws when fieldname is the empty string', function () {
        expect(() => SelectMatch.generate({ match: { '': 'value' } })).to.throw(Errors.ValidationError, /empty field/);
      });

      it('throws when value is null', function () {
        expect(() => SelectMatch.generate({ match: { fieldname: null } })).to.throw(
          Errors.ValidationError,
          /value null/
        );
      });

      it('throws when value is empty string', function () {
        expect(() => SelectMatch.generate({ match: { fieldname: '' } })).to.throw(
          Errors.ValidationError,
          /empty value/
        );
      });

      it('wraps a non-ValidationError thrown during construction', function () {
        // An unclosed-group regex string passes is_regexy() but makes
        // regexy_to_regex throw SyntaxError, which the catch block wraps.
        expect(() => SelectMatch.generate({ match: { fieldname: '/(unclosed/' } })).to.throw(
          Errors.ValidationError,
          /Failed to create select from definition/
        );
      });
    });
  });

  describe('SelectEquals', function () {
    it('builds an object', function (done: Function) {
      debug('SelectEquals', SelectEquals);
      const select_equals_instance = new SelectEquals('fieldname', 'ovalue');
      expect(select_equals_instance).to.be.an.instanceof(SelectEquals);
      done();
    });

    it('builds an object from types', function (done: Function) {
      const select_equals_cls = Select.types.equals;
      const select_equals_ins = new select_equals_cls('fieldname', 'tvalue');
      expect(select_equals_ins).to.be.an.instanceof(SelectEquals);
      done();
    });

    it('generates an object from definition', function (done: Function) {
      const ins = Select.generate({
        equals: {
          fieldname: 'value',
        },
      });
      expect(ins).to.be.an.instanceof(Select);
      expect(ins.run).to.exist;
      expect(ins.selects[0]).to.be.an.instanceof(SelectEquals);
      done();
    });

    it('generates an object from two definitions', function (done: Function) {
      const ins = Select.generate({
        equals: {
          fieldname: 'value',
          altname: 'altvalue',
        },
      });
      expect(ins).to.be.an.instanceof(Select);
      expect(ins.run).to.exist;
      debug('TD %O', ins.selects);
      expect(ins.selects[0]).to.be.an.instanceof(SelectEquals);
      expect(ins.selects[1]).to.be.an.instanceof(SelectEquals);
      done();
    });

    it('generates an object from one definition with two possibilities', function (done: Function) {
      const ins = Select.generate({
        equals: {
          fieldname: ['value1', 'value2'],
        },
      });
      expect(ins).to.be.an.instanceof(Select);
      expect(ins.run).to.exist;
      debug('TD %O', ins.selects);
      expect(ins.selects[0]).to.be.an.instanceof(SelectEquals);
      done();
    });

    it('generates an object from two definition with two possibilities', function (done: Function) {
      const ins = Select.generate({
        equals: {
          fieldname: ['value1', 'value2'],
          altname: ['altvalue1', 'altvalue2'],
        },
      });
      expect(ins).to.be.an.instanceof(Select);
      expect(ins.run).to.exist;
      debug('TD %O', ins.selects);
      expect(ins.selects[0]).to.be.an.instanceof(SelectEquals);
      expect(ins.selects[1]).to.be.an.instanceof(SelectEquals);
      done();
    });

    it('throws when :equals key is missing', function () {
      expect(() => SelectEquals.generate({})).to.throw(Errors.ValidationError, /need equals in definition/);
    });

    it('throws when fieldname is the empty string', function () {
      expect(() => SelectEquals.generate({ equals: { '': 'value' } })).to.throw(
        Errors.ValidationError,
        /requires a \[field\]/
      );
    });

    it('throws when value is null', function () {
      expect(() => SelectEquals.generate({ equals: { fieldname: null } })).to.throw(
        Errors.ValidationError,
        /requires a \[value\]/
      );
    });

    it('throws when value is the empty string', function () {
      expect(() => SelectEquals.generate({ equals: { fieldname: '' } })).to.throw(
        Errors.ValidationError,
        /requires a \[value\]/
      );
    });

    it('throws when an array value contains an empty string (via generate)', function () {
      expect(() => SelectEquals.generate({ equals: { fieldname: ['ok', ''] } })).to.throw(
        Errors.ValidationError,
        /requires a \[value\]/
      );
    });

    it('throws when no selects could be built (empty equals object)', function () {
      expect(() => SelectEquals.generate({ equals: {} })).to.throw(Errors.ValidationError, /No selects could be built/);
    });

    it('throws when an array value contains an empty string (via constructor)', function () {
      expect(() => new SelectEquals('fieldname', ['ok', ''])).to.throw(/param in values is empty/);
    });

    it('error nicely on missing params', function (done: Function) {
      const fn = function () {
        return new SelectEquals();
      };
      expect(fn).to.throw('equals The first paramater `field` must be defined');
      done();
    });

    it('error nicely on missing second value param', function (done: Function) {
      const fn = function () {
        return new SelectEquals('f');
      };
      expect(fn).to.throw('equals The second paramater `value` must be defined');
      done();
    });

    it('can run a successful match (single)', function (done: Function) {
      const ev = Event.generate({ fieldname: 'mvalue' });
      const matcher = new SelectEquals('fieldname', 'mvalue');
      expect(matcher.run(ev)).to.equal(true);
      done();
    });

    it('can run a failed match (single)', function (done: Function) {
      const ev = Event.generate({ fieldname: 'nope' });
      const matcher = new SelectEquals('fieldname', 'fvalue');
      expect(matcher.run(ev)).to.equal(false);
      done();
    });

    it('can run a successful match (many)', function (done: Function) {
      const ev = Event.generate({ fieldname: 'mvalue' });
      const matcher = new SelectEquals('fieldname', ['notme', 'also not me', 'mvalue']);
      expect(matcher.run(ev)).to.equal(true);
      done();
    });

    it('can run a failed match (many)', function (done: Function) {
      const ev = Event.generate({ fieldname: 'nope' });
      const matcher = new SelectEquals('fieldname', ['fvalue', 'another fvalue', 'last_chance']);
      expect(matcher.run(ev)).to.equal(false);
      done();
    });

    it('can return to the definition', function (done: Function) {
      const matcher = new SelectEquals('fieldname', 'fvalue');
      expect(matcher.to_yaml_obj()).to.eql({
        equals: {
          fieldname: 'fvalue',
        },
      });
      done();
    });

    it('had a label of equals', function () {
      const matcher = new SelectEquals('fieldname', /yes/);
      expect(matcher.label).to.equal('equals');
    });

    it('dumps the correct object back string', function () {
      const matcher = new SelectEquals('fieldname', 'yes');
      expect(matcher.to_yaml_obj()).to.eql({ equals: { fieldname: 'yes' } });
    });

    it('dumps the correct object back array', function () {
      const matcher = new SelectEquals('fieldname', ['yes', 'no']);
      expect(matcher.to_yaml_obj()).to.eql({
        equals: {
          fieldname: ['yes', 'no'],
        },
      });
    });

    it('dumps a yaml string back', function () {
      const selector = new SelectEquals('fieldname', 'yes');
      expect(selector.to_yaml()).to.eql("equals:\n  fieldname: 'yes'\n");
    });
  });

  describe('SelectAll', function () {
    it('builds an object', function (done: Function) {
      debug('SelectAll', SelectAll);
      const select_match_instance = new SelectAll();
      expect(select_match_instance).to.be.an.instanceof(SelectAll);
      done();
    });

    it('builds an object from types', function (done: Function) {
      const select_match_cls = Select.types.all;
      const select_match_ins = new select_match_cls();
      expect(select_match_ins).to.be.an.instanceof(SelectAll);
      done();
    });

    it('can run a match', function (done: Function) {
      const matcher = new SelectAll();
      const result = matcher.run({
        fieldname: 'mvalue',
      });
      expect(result).to.equal(true);
      done();
    });

    it('can return to the definition', function (done: Function) {
      const matcher = new SelectAll();
      expect(matcher.to_yaml_obj()).to.eql({ all: true });
      done();
    });

    it('had a label of all', function () {
      const matcher = new SelectAll('fieldname', /yes/);
      expect(matcher.label).to.equal('all');
    });
  });

  describe('SelectFieldExists', function () {
    it('builds an object', function (done: Function) {
      debug('SelectFieldExists', SelectFieldExists);
      const select_match_instance = new SelectFieldExists('field_name');
      expect(select_match_instance).to.be.an.instanceof(SelectFieldExists);
      done();
    });

    it('builds an object from types', function (done: Function) {
      const select_fe_cls = Select.types.field_exists;
      const select_fe_ins = new select_fe_cls('field_name_types');
      expect(select_fe_ins).to.be.an.instanceof(SelectFieldExists);
      done();
    });

    it('generate an object from a definition', function (done: Function) {
      const select_fe_ins = Select.types.field_exists.generate({
        field_exists: 'fieldname',
      });
      expect(select_fe_ins).to.be.an.instanceof(SelectFieldExists);
      done();
    });

    it('can run a match', function (done: Function) {
      const ev = Event.generate({ fieldname: 'mvalue' });
      const matcher = new SelectFieldExists('fieldname');
      expect(matcher.run(ev)).to.equal(true);
      done();
    });

    it('can fail a match', function (done: Function) {
      const ev = Event.generate({ fieldnope: 'mvalue' });
      const matcher = new SelectFieldExists('fieldname');
      expect(matcher.run(ev)).to.equal(false);
      done();
    });

    it('can return to the definition', function (done: Function) {
      const matcher = new SelectFieldExists('fieldname');
      expect(matcher.to_yaml_obj()).to.eql({ field_exists: 'fieldname' });
      done();
    });

    it('had a label of field_exists', function () {
      const matcher = new SelectFieldExists('fieldname', /yes/);
      expect(matcher.label).to.equal('field_exists');
    });

    it('throws a validation error during generate', function (done: Function) {
      const fn = function () {
        return SelectFieldExists.generate('');
      };
      expect(fn).to.throw(Errors.ValidationError, /Definition has no key /);
      done();
    });

    it('can run a syslog match', function (done: Function) {
      const ev = Event.generate({ fieldname: 'mvalue' });
      ev.set_input('fieldname', 'myvalue');
      const matcher = new SelectFieldExists('input.fieldname');
      expect(matcher.run(ev)).to.equal(true);
      done();
    });

    it('can run an original match', function (done: Function) {
      const ev = Event.generate({ fieldname: 'mvalue' });
      ev.original.fieldname = 'myvalue';
      const matcher = new SelectFieldExists('original.fieldname');
      expect(matcher.run(ev)).to.equal(true);
      done();
    });
  });

  describe('SelectFieldMissing', function () {
    it('builds an object', function (done: Function) {
      const select_fm_instance = new SelectFieldMissing('fieldname');
      expect(select_fm_instance).to.be.an.instanceof(SelectFieldMissing);
      done();
    });

    it('builds an object from types', function (done: Function) {
      const select_fm_cls = Select.types.field_missing;
      const select_fm_ins = new select_fm_cls('fieldname');
      expect(select_fm_ins).to.be.an.instanceof(SelectFieldMissing);
      done();
    });

    it('generate an object from a definition', function (done: Function) {
      const select_fe_ins = SelectFieldMissing.generate({ field_missing: 'fieldname' });
      expect(select_fe_ins).to.be.an.instanceof(SelectFieldMissing);
      expect(select_fe_ins.field).to.equal('fieldname');
      done();
    });

    it('can run a match', function (done: Function) {
      const ev = Event.generate({ fieldname: 'mvalue' });
      const matcher = new SelectFieldMissing('fieldnope');
      expect(matcher.run(ev)).to.equal(true);
      done();
    });

    it('can fail a match', function (done: Function) {
      const ev = Event.generate({ fieldname: 'mvalue' });
      const matcher = new SelectFieldMissing('fieldname');
      expect(matcher.run(ev)).to.equal(false);
      done();
    });

    it('can return to the definition', function (done: Function) {
      const matcher = new SelectFieldMissing('fieldname');
      expect(matcher.to_yaml_obj()).to.eql({ field_missing: 'fieldname' });
      done();
    });

    it('had a label of field_missing', function () {
      const matcher = new SelectFieldMissing('fieldname', /yes/);
      expect(matcher.label).to.equal('field_missing');
    });

    it('throws a validation error during generate', function (done: Function) {
      const fn = function () {
        return SelectFieldMissing.generate('');
      };
      expect(fn).to.throw(Errors.ValidationError, /Definition has no key /);
      done();
    });

    it('can run a syslog field_missing', function (done: Function) {
      const ev = Event.generate({ fieldname: 'mvalue' });
      const matcher = new SelectFieldMissing('syslog.fieldname2');
      expect(matcher.run(ev)).to.equal(true);
      done();
    });

    it('can run an original field_missing', function (done: Function) {
      const ev = Event.generate({ fieldname: 'mvalue' });
      const matcher = new SelectFieldMissing('original.fieldname2');
      expect(matcher.run(ev)).to.equal(true);
      done();
    });
  });

  describe('SelectLessThan', function () {
    it('builds an object', function (done: Function) {
      const select_fm_instance = new SelectLessThan('fieldname', 5);
      expect(select_fm_instance).to.be.an.instanceof(SelectLessThan);
      done();
    });

    it('builds an object from types', function (done: Function) {
      const select_fm_cls = Select.types.less_than;
      const select_fm_ins = new select_fm_cls('fieldname', 5);
      expect(select_fm_ins).to.be.an.instanceof(SelectLessThan);
      done();
    });

    it('generate an object from a definition', function (done: Function) {
      const select_fe_ins = SelectLessThan.generate({
        less_than: {
          fieldname: 5,
        },
        //select: fieldname less_than 5
        //select: fieldname lt 5
        //select: fieldname < 5
      });
      expect(select_fe_ins[0]).to.be.an.instanceof(SelectLessThan);
      expect(select_fe_ins[0].field).to.equal('fieldname');
      done();
    });

    it('can run a match', function (done: Function) {
      const ev = Event.generate({ fieldname: 5 });
      const matcher = new SelectLessThan('fieldname', 6);
      expect(matcher.run(ev)).to.equal(true);
      done();
    });

    it('can fail a match', function (done: Function) {
      const ev = Event.generate({ fieldname: 5 });
      const matcher = new SelectLessThan('fieldname', 4);
      expect(matcher.run(ev)).to.equal(false);
      done();
    });

    it('can fail on a field a match', function (done: Function) {
      const ev = Event.generate({ fieldname: 5 });
      const matcher = new SelectLessThan('fieldnope', 6);
      expect(matcher.run(ev)).to.equal(false);
      done();
    });

    it('can return to the definition', function (done: Function) {
      const matcher = new SelectLessThan('fieldnope', 4);
      expect(matcher.to_yaml_obj()).to.eql({
        less_than: {
          fieldnope: 4,
        },
      });
      done();
    });

    it('had a label of less_than', function () {
      const matcher = new SelectLessThan('fieldname', /yes/);
      expect(matcher.label).to.equal('less_than');
    });

    it('throws a validation error during generate', function (done: Function) {
      const fn = function () {
        return SelectLessThan.generate('');
      };
      expect(fn).to.throw(Errors.ValidationError, /Definition has no key /);
      done();
    });
  });

  describe('SelectGreaterThan', function () {
    it('builds an object', function (done: Function) {
      const select_fm_instance = new SelectGreaterThan('fieldname', 5);
      expect(select_fm_instance).to.be.an.instanceof(SelectGreaterThan);
      done();
    });

    it('builds an object from types', function (done: Function) {
      const select_fm_cls = Select.types.greater_than;
      const select_fm_ins = new select_fm_cls('fieldname', 5);
      expect(select_fm_ins).to.be.an.instanceof(SelectGreaterThan);
      done();
    });

    it('generate an object from a definition', function (done: Function) {
      const select_fe_ins = SelectGreaterThan.generate({
        greater_than: {
          fieldname: 5,
        },
        //select: fieldname greater_than 5
        //select: fieldname gt 5
        //select: fieldname > 5
      });
      expect(select_fe_ins[0]).to.be.an.instanceof(SelectGreaterThan);
      expect(select_fe_ins[0].field).to.equal('fieldname');
      done();
    });

    it('can run a match', function (done: Function) {
      const ev = Event.generate({ fieldname: 4 });
      const matcher = new SelectGreaterThan('fieldname', 3);
      expect(matcher.run(ev)).to.equal(true);
      done();
    });

    it('can fail a match', function (done: Function) {
      const ev = Event.generate({ fieldname: 4 });
      const matcher = new SelectGreaterThan('fieldname', 5);
      expect(matcher.run(ev)).to.equal(false);
      done();
    });

    it('can fail on a field a match', function (done: Function) {
      const ev = Event.generate({ fieldname: 4 });
      const matcher = new SelectGreaterThan('fieldnope', 4);
      expect(matcher.run(ev)).to.equal(false);
      done();
    });

    it('can return to the definition', function (done: Function) {
      const matcher = new SelectGreaterThan('fieldnope', 4);
      expect(matcher.to_yaml_obj()).to.eql({
        greater_than: {
          fieldnope: 4,
        },
      });
      done();
    });

    it('had a label of greater_than', function () {
      const matcher = new SelectGreaterThan('fieldname', /yes/);
      expect(matcher.label).to.equal('greater_than');
    });

    it('throws a validation error during generate', function (done: Function) {
      const fn = function () {
        return SelectGreaterThan.generate('');
      };
      expect(fn).to.throw(Errors.ValidationError, /Definition has no key /);
      done();
    });
  });

  describe('SelectStartsWith', function () {
    it('builds an object', function (done: Function) {
      const select_sw_instance = new SelectStartsWith('fieldname', 5);
      expect(select_sw_instance).to.be.an.instanceof(SelectStartsWith);
      done();
    });

    it('builds an object from types', function (done: Function) {
      const select_sw_cls = Select.types.starts_with;
      const select_sw_ins = new select_sw_cls('fieldname', 5);
      expect(select_sw_ins).to.be.an.instanceof(SelectStartsWith);
      done();
    });

    it('generate an object from a definition', function (done: Function) {
      const select_fe_ins = SelectStartsWith.generate({
        starts_with: {
          fieldname: 'start',
        },
        //select: fieldname greater_than 5
        //select: fieldname gt 5
        //select: fieldname > 5
      });
      expect(select_fe_ins[0]).to.be.an.instanceof(SelectStartsWith);
      expect(select_fe_ins[0].field).to.equal('fieldname');
      done();
    });

    it('can run a match', function (done: Function) {
      const ev = Event.generate({ fieldname: 'starts with the text' });
      const matcher = new SelectStartsWith('fieldname', 'sta');
      expect(matcher.run(ev)).to.equal(true);
      done();
    });

    it('can fail a match', function (done: Function) {
      const ev = Event.generate({ fieldname: 4 });
      const matcher = new SelectStartsWith('fieldname', 'tart');
      expect(matcher.run(ev)).to.equal(false);
      done();
    });

    it('can fail on a field a match', function (done: Function) {
      const ev = Event.generate({ fieldname: 4 });
      const matcher = new SelectStartsWith('fieldnope', 'start');
      expect(matcher.run(ev)).to.equal(false);
      done();
    });

    it('can return to the definition', function (done: Function) {
      const matcher = new SelectStartsWith('fieldnope', 4);
      expect(matcher.to_yaml_obj()).to.eql({
        starts_with: {
          fieldnope: 4,
        },
      });
      done();
    });

    it('had a label of greater_than', function () {
      const matcher = new SelectStartsWith('fieldname', 'yep');
      expect(matcher.label).to.equal('starts_with');
    });
  });

  describe('SelectEndsWith', function () {
    it('builds an object', function (done: Function) {
      const select_ew_instance = new SelectEndsWith('fieldname', 5);
      expect(select_ew_instance).to.be.an.instanceof(SelectEndsWith);
      done();
    });

    it('builds an object from types', function (done: Function) {
      const select_ew_cls = Select.types.ends_with;
      const select_ew_ins = new select_ew_cls('fieldname', 5);
      expect(select_ew_ins).to.be.an.instanceof(SelectEndsWith);
      done();
    });

    it('generate an object from a definition', function (done: Function) {
      const select_fe_ins = SelectEndsWith.generate({
        ends_with: {
          fieldname: 'end',
        },
        //select: fieldname greater_than 5
        //select: fieldname gt 5
        //select: fieldname > 5
      });
      expect(select_fe_ins[0]).to.be.an.instanceof(SelectEndsWith);
      expect(select_fe_ins[0].field).to.equal('fieldname');
      done();
    });

    it('can run a match', function (done: Function) {
      const ev = Event.generate({ fieldname: 'endsta' });
      const matcher = new SelectEndsWith('fieldname', 'sta');
      expect(matcher.run(ev)).to.equal(true);
      done();
    });

    it('can fail a match', function (done: Function) {
      const ev = Event.generate({ fieldname: 4 });
      const matcher = new SelectEndsWith('fieldname', 'tart');
      expect(matcher.run(ev)).to.equal(false);
      done();
    });

    it('can fail on a field a match', function (done: Function) {
      const ev = Event.generate({ fieldname: 4 });
      const matcher = new SelectEndsWith('fieldnope', 'start');
      expect(matcher.run(ev)).to.equal(false);
      done();
    });

    it('can return to the definition', function (done: Function) {
      const matcher = new SelectEndsWith('fieldnope', 4);
      expect(matcher.to_yaml_obj()).to.eql({
        ends_with: {
          fieldnope: 4,
        },
      });
      done();
    });

    it('had a label of ends_with', function () {
      const matcher = new SelectEndsWith('fieldname', 'yep');
      expect(matcher.label).to.equal('ends_with');
    });
  });

  describe('Select', function () {
    it('throws a validation error during generate', function (done: Function) {
      const fn = function () {
        return Select.generate({
          name: 'select',
        });
      };
      expect(fn).to.throw(Errors.ValidationError, /Failed to generate select/);
      done();
    });
  });

  describe('Select from extra fields', function () {
    let ev: any = null;
    const source_event = {
      node: 'localhost',
      tag: 'tagged',
      extra: 'stuff',
      addendum: 'additional info',
    };

    beforeEach(function () {
      ev = Event.generate(source_event);
    });

    // starts_with
    it('can use additional extra data for StartsWith', function (done: Function) {
      const matcher = new SelectStartsWith('extra', 'stu');
      expect(matcher.run(ev)).to.equal(true);
      done();
    });

    it('can use additional addendum data for StartsWith', function (done: Function) {
      const matcher = new SelectStartsWith('addendum', 'addit');
      expect(matcher.run(ev)).to.equal(true);
      done();
    });

    it('can use additional data for StartsWith (input)', function (done: Function) {
      const matcher = new SelectStartsWith('input.extra', 'stu');
      expect(matcher.run(ev)).to.equal(true);
      done();
    });

    it('can use additional data for StartsWith (original)', function (done: Function) {
      const matcher = new SelectStartsWith('original.extra', 'stu');
      expect(matcher.run(ev)).to.equal(true);
      done();
    });

    // ends_with
    it('can use additional data for EndsWith (input)', function (done: Function) {
      const matcher = new SelectEndsWith('input.extra', 'tuff');
      expect(matcher.run(ev)).to.equal(true);
      done();
    });

    it('can use additional data for EndsWith (original)', function (done: Function) {
      const matcher = new SelectEndsWith('original.extra', 'tuff');
      expect(matcher.run(ev)).to.equal(true);
      done();
    });

    // equals
    it('can use additional data for Equals (input)', function (done: Function) {
      const matcher = new SelectEquals('input.extra', 'stuff');
      expect(matcher.run(ev)).to.equal(true);
      done();
    });

    it('can use additional data for Equals (original)', function (done: Function) {
      const matcher = new SelectEquals('original.extra', 'stuff');
      expect(matcher.run(ev)).to.equal(true);
      done();
    });

    // field_exists
    it('can use additional data for FieldExists (input.extra)', function (done: Function) {
      const matcher = new SelectFieldExists('input.extra');
      expect(matcher.run(ev)).to.equal(true);
      done();
    });

    it('can detect missing additional data for FieldExists (input)', function (done: Function) {
      const matcher = new SelectFieldExists('input.bogus');
      expect(matcher.run(ev)).to.equal(false);
      done();
    });

    it('can use additional data for FieldExists (original.extra)', function (done: Function) {
      const matcher = new SelectFieldExists('original.extra');
      expect(matcher.run(ev)).to.equal(true);
      done();
    });

    it('can detect missing additional data for FieldExists (original)', function (done: Function) {
      const matcher = new SelectFieldExists('original.bogus');
      expect(matcher.run(ev)).to.equal(false);
      done();
    });

    // field_missing
    it('can use additional data for FieldMissing (input.extra)', function (done: Function) {
      const matcher = new SelectFieldMissing('input.extra');
      expect(matcher.run(ev)).to.equal(false);
      done();
    });

    it('can detect missing additional data for FieldMissing (input)', function (done: Function) {
      const matcher = new SelectFieldMissing('input.bogus');
      expect(matcher.run(ev)).to.equal(true);
      done();
    });

    it('can use additional data for FieldMissing (original.extra)', function (done: Function) {
      const matcher = new SelectFieldMissing('original.extra');
      expect(matcher.run(ev)).to.equal(false);
      done();
    });

    it('can detect missing additional data for FieldMissing (original)', function (done: Function) {
      const matcher = new SelectFieldMissing('original.bogus');
      expect(matcher.run(ev)).to.equal(true);
      done();
    });

    // match
    it('can match on extra data in the input', function (done: Function) {
      const matcher = new SelectMatch('input.extra', ['/^st/', 'uff$/']);
      expect(matcher.run(ev)).to.equal(true);
      done();
    });

    it('cant match on extra data in the input', function (done: Function) {
      const matcher = new SelectMatch('input.extra', ['/^nst/', 'nuff$/']);
      expect(matcher.run(ev)).to.equal(false);
      done();
    });

    it('can match on addendum data in the input', function (done: Function) {
      const matcher = new SelectMatch('input.addendum', ['/^add/', 'info$/']);
      expect(matcher.run(ev)).to.equal(true);
      done();
    });

    it('cant match on addendum data in the input', function (done: Function) {
      const matcher = new SelectMatch('input.addendum', ['/^nadd/', 'ninfo$/']);
      expect(matcher.run(ev)).to.equal(false);
      done();
    });
  });
});
