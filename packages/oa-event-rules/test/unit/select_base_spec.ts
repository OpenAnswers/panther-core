//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const debug = require('debug')('oa:test:unit:rules:select_base');

const Errors = require('oa-errors');

const { expect } = require('../mocha_helpers');

const { SelectBase, SelectBaseField, SelectBaseFieldValue, SelectBaseSingle } = require('../../lib/select_base');

describe('SelectBase', function () {
  it('has a label of "__base"', function () {
    expect(SelectBase.label).to.equal('__base');
    expect(new SelectBase().label).to.equal('__base');
  });

  it('static description() throws — must be implemented by subclasses', function () {
    expect(() => SelectBase.description()).to.throw(/description not implemented/);
  });

  it('run() throws — must be implemented by subclasses', function () {
    expect(() => new SelectBase().run()).to.throw(/run not implemented/);
  });

  it('to_yaml_obj() throws — must be implemented by subclasses', function () {
    expect(() => new SelectBase().to_yaml_obj()).to.throw(/to_yaml_obj not implemented/);
  });

  it('toString() returns the label', function () {
    expect(new SelectBase().toString()).to.equal('__base');
  });

  it('to_yaml() delegates to to_yaml_obj and therefore also throws', function () {
    expect(() => new SelectBase().to_yaml()).to.throw(/to_yaml_obj not implemented/);
  });
});

describe('SelectBaseField', function () {
  class TestField extends SelectBaseField {}
  (TestField as any).label = 'test_field';

  it('has a description() describing a single string input named "field"', function () {
    expect(TestField.description()).to.eql({
      name: 'test_field',
      input: [{ name: 'field', type: 'string' }],
    });
  });

  it('stores field on construction', function () {
    const ins = new TestField('nodename');
    expect(ins.field).to.equal('nodename');
    expect(ins.label).to.equal('test_field');
  });

  it('throws when field is missing', function () {
    expect(() => new TestField()).to.throw(/first paramater `field` must be defined/);
  });

  it('run() throws — subclasses must implement', function () {
    expect(() => new TestField('f').run()).to.throw(/run not implemented/);
  });

  it('toString() includes label and field', function () {
    expect(new TestField('nodename').toString()).to.equal('test_field nodename');
  });

  it('to_yaml_obj() uses label as key and field as value', function () {
    expect(new TestField('nodename').to_yaml_obj()).to.eql({ test_field: 'nodename' });
  });

  describe('generate', function () {
    it('creates an instance from a matching yaml definition', function () {
      const ins = TestField.generate({ test_field: 'nodename' });
      expect(ins).to.be.an.instanceof(TestField);
      expect(ins.field).to.equal('nodename');
    });

    it('throws ValidationError when the label key is missing', function () {
      expect(() => TestField.generate({})).to.throw(Errors.ValidationError, /Definition has no key/);
    });

    it('throws ValidationError on non-object input', function () {
      expect(() => TestField.generate('')).to.throw(Errors.ValidationError, /Definition has no key/);
    });
  });
});

describe('SelectBaseFieldValue', function () {
  class TestFV extends SelectBaseFieldValue {}
  (TestFV as any).label = 'test_fv';

  it('has a description() describing field + value inputs', function () {
    expect(TestFV.description()).to.eql({
      name: 'test_fv',
      input: [
        { name: 'field', label: 'Field', type: 'string' },
        { name: 'value', label: 'Value', type: 'string' },
      ],
    });
  });

  it('stores field and value on construction', function () {
    const ins = new TestFV('node', 'n1');
    expect(ins.field).to.equal('node');
    expect(ins.value).to.equal('n1');
    expect(ins.label).to.equal('test_fv');
  });

  it('throws ValidationError when field is null or empty', function () {
    expect(() => new TestFV(null, 'v')).to.throw(Errors.ValidationError, /first paramater `field`/);
    expect(() => new TestFV('', 'v')).to.throw(Errors.ValidationError, /first paramater `field`/);
  });

  it('throws ValidationError when value is null or empty', function () {
    expect(() => new TestFV('f', null)).to.throw(Errors.ValidationError, /second paramater `value`/);
    expect(() => new TestFV('f', '')).to.throw(Errors.ValidationError, /second paramater `value`/);
  });

  it('run() throws — subclasses must implement', function () {
    expect(() => new TestFV('f', 'v').run()).to.throw(/run not implemented/);
  });

  it('toString() includes field, label, and quoted value', function () {
    expect(new TestFV('node', 'n1').toString()).to.equal("node test_fv 'n1'");
  });

  it('to_yaml_obj() nests field→value under label', function () {
    expect(new TestFV('node', 'n1').to_yaml_obj()).to.eql({ test_fv: { node: 'n1' } });
  });

  describe('generate', function () {
    it('returns an array of instances, one per fieldname', function () {
      const arr = TestFV.generate({ test_fv: { node: 'n1', site: 's1' } });
      expect(arr).to.be.an('array').with.lengthOf(2);
      expect(arr[0]).to.be.an.instanceof(TestFV);
      expect(arr[0].field).to.equal('node');
      expect(arr[0].value).to.equal('n1');
      expect(arr[1].field).to.equal('site');
      expect(arr[1].value).to.equal('s1');
    });

    it('throws ValidationError when label key is missing', function () {
      expect(() => TestFV.generate({})).to.throw(Errors.ValidationError, /Definition has no key/);
    });

    it('throws ValidationError when no fields are present under the label', function () {
      expect(() => TestFV.generate({ test_fv: {} })).to.throw(Errors.ValidationError, /No fields defined for select/);
    });
  });
});

describe('SelectBaseSingle', function () {
  class TestSingle extends SelectBaseSingle {}
  (TestSingle as any).label = 'test_single';

  it('description() has name and empty input', function () {
    expect(TestSingle.description()).to.eql({ name: 'test_single', input: [] });
  });

  it('generate() returns an instance regardless of yaml', function () {
    expect(TestSingle.generate({})).to.be.an.instanceof(TestSingle);
    expect(TestSingle.generate({ anything: 123 })).to.be.an.instanceof(TestSingle);
  });

  it('to_yaml_obj() produces { <label>: true }', function () {
    expect(new TestSingle().to_yaml_obj()).to.eql({ test_single: true });
  });
});
