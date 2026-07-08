//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
import { describe, it, expect, beforeAll } from 'vitest';

describe('GenericInput', function () {
  const logger = debug('oa:test:event:rules:generic_input');

  describe('base class', function () {
    describe('instance', function () {
      let gi: any = null;

      beforeAll(function () {
        gi = new GenericInput({
          class: 'classt',
          logger: function () {
            return 'common';
          },
          template_id: '#id',
        });
      });

      it('has a element class string', function () {
        expect(gi).to.have.property('class').and.to.equal('classt');
      });

      it('has a element name string', function () {
        expect(gi).to.have.property('name').and.to.equal('_noname');
      });

      it('has a falsey label by default', function () {
        expect(gi).to.have.property('label').and.to.equal(undefined);
      });

      it('has a logger function', function () {
        expect(gi).to.have.property('logger').and.to.be.a('function');
      });

      it('has a template id', function () {
        expect(gi).to.have.property('template_id').and.to.equal('#id');
      });

      it('has a euid string', function () {
        expect(gi).to.have.property('euid').and.be.a('string');
        expect(gi.euid).to.match(/^gi\w+/);
      });

      it('has a render function', function () {
        expect(gi).to.have.property('render').and.be.a('function');
      });
    });
  });

  describe('Label and Value', function () {
    describe('instance', function () {
      let giv: any = null;

      beforeAll(function () {
        giv = new GenericInputLabelValue();
      });

      it('has a template id', function () {
        expect(giv).to.have.property('template_id').and.to.equal('#template-generic-value');
      });
    });

    describe('rendering', function () {
      let giv: any = null;

      beforeAll(function () {
        const $cont = $('<div/>');
        $('#generic-input-render-test').append($cont);
        giv = new GenericInputLabelValue({
          name: 'a_fieldname',
          value: 'a value',
          label: 'ALabel',
          $container: $cont,
        });
        giv.render();
      });

      it('has name data attached', function () {
        const $el = giv.$container.find('.generic-value-edit');
        expect($el).to.have.length(1);
        expect($el.attr('data-name')).to.equal('a_fieldname');
      });

      it('has a name/label field', function () {
        const $el = giv.$container.find('.generic-value-fieldview');
        expect($el).to.have.length(1);
        expect($el.text()).to.equal('ALabel');
      });

      it('has an input field', function () {
        const $el = giv.$container.find('.generic-value-value > input');
        expect($el.val()).to.equal('a value');
      });
    });
  });

  describe('Labels and Values', function () {
    describe('instance', function () {
      let givs: any = null;

      beforeAll(function () {
        givs = new GenericInputLabelValues();
      });

      it('has a template id', function () {
        expect(givs).to.have.property('template_id').and.to.equal('#template-generic-values');
      });
    });

    describe('rendering', function () {
      let givs: any = null;

      beforeAll(function () {
        const $cont = $('<div/>');
        $('#generic-input-render-test').append($cont);
        givs = new GenericInputLabelValues({
          name: 'vs_fieldsname',
          field_values: {
            vname1: 'vvalue1',
            vname2: 'vvalue2',
          },
          label: 'ALabels',
          $container: $cont,
        });
        givs.render();
      });

      it('has name data attached', function () {
        const $el = givs.$container.find('.generic-values-edit');
        expect($el).to.have.length(1);
        expect($el.attr('data-name')).to.equal('vs_fieldsname');
      });

      it('has a name/label field', function () {
        const $el = givs.$container.find('.generic-values-fieldview');
        expect($el).to.have.length(2);
        expect($($el[0]).text()).to.equal('vname1');
        expect($($el[1]).text()).to.equal('vname2');
      });

      it('has two input fields', function () {
        const $el = givs.$container.find('.generic-values-value > input');
        expect($el.length).to.equal(2);
        expect($($el[0]).val()).to.equal('vvalue1');
        expect($($el[1]).val()).to.equal('vvalue2');
      });
    });
  });

  describe('Field and Value', function () {
    describe('instance', function () {
      let gifv: any = null;

      beforeAll(function () {
        gifv = new GenericInputFieldValue();
      });

      it('has a template id', function () {
        expect(gifv).to.have.property('template_id').and.to.equal('#template-generic-fieldvalue');
      });
    });

    describe('rendering', function () {
      let giv: any = null;

      beforeAll(function () {
        const $cont = $('<div/>');
        $('#generic-input-render-test').append($cont);
        giv = new GenericInputFieldValue({
          name: 'b_fieldvalue',
          field: 'bthefield',
          value: 'bthevalue',
          label: 'bLabel',
          $container: $cont,
        });
        giv.render();
      });

      it('has name data attached', function () {
        const $el = giv.$container.find('.generic-fieldvalue-edit');
        expect($el).to.have.length(1);
        expect($el.attr('data-name')).to.equal('b_fieldvalue');
      });

      it('has a name/label field', function () {
        const $el = giv.$container.find('.generic-fieldvalue-field > input');
        expect($el).to.have.length(1);
        expect($el.val()).to.equal('bthefield');
      });

      it('has an input field', function () {
        const $el = giv.$container.find('.generic-fieldvalue-value > input');
        expect($el).to.have.length(1);
        expect($el.val()).to.equal('bthevalue');
      });
    });
  });

  describe('Fields and Values', function () {
    describe('instance', function () {
      let gifvs: any = null;

      beforeAll(function () {
        gifvs = new GenericInputFieldValues();
      });

      it('has a template id', function () {
        expect(gifvs).to.have.property('template_id').and.to.equal('#template-generic-fieldvalues');
      });
    });

    describe('rendering', function () {
      let givs: any = null;
      const field_values = {
        fvsfield1: 'fvsval1',
        fvsfield2: 'fvsval2',
      };

      beforeAll(function () {
        const $cont = $('<div/>');
        $('#generic-input-render-test').append($cont);
        givs = new GenericInputFieldValues({
          name: 'fvs_fieldsvaluesname',
          field_values: field_values,
          label: 'fvs',
          $container: $cont,
        });
        givs.render();
      });

      it('has name data attached', function () {
        const $el = givs.$container.find('.generic-fieldvalues-edit');
        expect($el).to.have.length(1);
        expect($el.attr('data-name')).to.equal('fvs_fieldsvaluesname');
      });

      it('has a name/label field', function () {
        const $el = givs.$container.find('.generic-fieldvalues-field > input');
        expect($el).to.have.length(2);
        expect($($el[0]).val()).to.equal('fvsfield1');
        expect($($el[1]).val()).to.equal('fvsfield2');
      });

      it('has two input fields', function () {
        const $el = givs.$container.find('.generic-fieldvalues-value > input');
        expect($el.length).to.equal(2);
        expect($($el[0]).val()).to.equal('fvsval1');
        expect($($el[1]).val()).to.equal('fvsval2');
      });

      it('doms back to the same object', function () {
        const obj = givs.dom_to_yaml_obj();
        expect(obj).to.have.property('fvs_fieldsvaluesname');
        logger('dom to objects', obj.fvs_fieldsvaluesname, field_values);
        expect(obj.fvs_fieldsvaluesname).to.eql(field_values);
      });

      it('adds a new initial entry', function () {
        givs.add_new_entry();
        const $el = givs.$container.find('.generic-fieldvalues-value > input');
        expect($el).to.have.length(3);
      });
    });
  });

  describe('Select/Enums', function () {
    describe('Label and Enum', function () {
      describe('instance', function () {
        let giv: any = null;

        beforeAll(function () {
          giv = new GenericInputLabelEnum();
        });

        it('has a template id', function () {
          expect(giv).to.have.property('template_id').and.to.equal('#template-generic-labelenum');
        });
      });

      describe('rendering', function () {
        let giv: any = null;

        beforeAll(function () {
          const $cont = $('<div/>');
          $('#generic-input-render-test').append($cont);
          giv = new GenericInputLabelEnum({
            name: 'e_fieldname',
            value: 'e enum',
            label: 'ELabel',
            options_list: [
              { label: 'One', value: '1', selected: false },
              { label: 'Two', value: '2', selected: true },
              { label: 'Three', value: '3' },
            ],
            $container: $cont,
          });
          giv.render();
        });

        it('has name data attached', function () {
          const $el = giv.$container.find('.generic-labelenum-edit');
          expect($el).to.have.length(1);
          expect($el.attr('data-name')).to.equal('e_fieldname');
        });

        it('has a name/label field', function () {
          const $el = giv.$container.find('.generic-labelenum-fieldview');
          expect($el).to.have.length(1);
          expect($el.text()).to.equal('ELabel');
        });

        it('has the select options', function () {
          const $els = giv.$container.find('.generic-labelenum-value > select > option');
          expect($els.length).to.equal(3);
          expect($($els[0]).attr('value')).to.equal('1');
          expect($($els[1]).text()).to.equal('Two');
        });

        it('has the default selected input field', function () {
          const $el = giv.$container.find('.generic-labelenum-value > select');
          expect($el.val()).to.equal('2');
        });
      });
    });

    describe('Label and Enums', function () {
      describe('instance', function () {
        let gie: any = null;

        beforeAll(function () {
          gie = new GenericInputLabelEnums({ options_list: [] });
        });

        it('has a template id', function () {
          expect(gie).to.have.property('template_id').and.to.equal('#template-generic-labelenums');
        });
      });

      describe('rendering', function () {
        let gie: any = null;

        beforeAll(function () {
          const $cont = $('<div/>');
          $('#generic-input-render-test').append($cont);
          gie = new GenericInputLabelEnums({
            name: 'es_fieldname',
            field_values: {
              testigna: 'A',
              testignb: 'ESLabelb',
            },
            options_list: [
              { label: 'Aaa', value: 'A' },
              { label: 'Bbb', value: 'ESLabelb' },
              { label: 'Ccc', value: 'C' },
            ],
            $container: $cont,
          });
          gie.render();
        });

        it('has name data attached', function () {
          const $el = gie.$container.find('.generic-labelenums-edit');
          expect($el).to.have.length(1);
          expect($el.attr('data-name')).to.equal('es_fieldname');
        });

        it('has a name/label field', function () {
          const $el = gie.$container.find('.generic-labelenums-fieldview');
          expect($el).to.have.length(2);
          expect($el.text()).to.equal('testignatestignb');
        });

        it('has the select options', function () {
          const $els = gie.$container.find('.generic-labelenums-value > select > option');
          expect($els.length).to.equal(6);
          expect($($els[0]).attr('value')).to.equal('A');
          expect($($els[1]).text()).to.equal('Bbb');
        });

        it('has the correct value selected by default', function () {
          const $els = gie.$container.find('.generic-labelenums-value > select');
          expect($els.length).to.equal(2);
          expect($($els[0]).val()).to.equal('A');
          expect($($els[1]).val()).to.equal('ESLabelb');
        });
      });
    });

    describe('Fields and Enums', function () {
      describe('instance', function () {
        let gie: any = null;

        beforeAll(function () {
          gie = new GenericInputFieldEnums({ options_list: [] });
        });

        it('has a template id', function () {
          expect(gie).to.have.property('template_id').and.to.equal('#template-generic-fieldenums');
        });
      });

      describe('rendering', function () {
        let gie: any = null;

        beforeAll(function () {
          const $cont = $('<div/>');
          $('#generic-input-render-test').append($cont);
          gie = new GenericInputFieldEnums({
            name: 'fes_fieldname',
            field_values: {
              testigna: 'FESLabelb',
              testignb: 'FC',
              testignc: 'Other',
            },
            options_list: [
              { label: 'Aaa', value: 'FA' },
              { label: 'Bbb', value: 'FESLabelb' },
              { label: 'Ccc', value: 'FC' },
            ],
            $container: $cont,
          });
          gie.render();
        });

        it('has name data attached', function () {
          const $el = gie.$container.find('.generic-fieldenums-edit');
          expect($el).to.have.length(1);
          expect($el.attr('data-name')).to.equal('fes_fieldname');
        });

        it('has a name/label field', function () {
          const $el = gie.$container.find('.generic-fieldenums-field > input');
          expect($el).to.have.length(3);
          expect($($el[0]).val()).to.equal('testigna');
          expect($($el[1]).val()).to.equal('testignb');
        });

        it('has the select options', function () {
          const $els = gie.$container.find('.generic-fieldenums-value > select > option');
          expect($els.length).to.equal(9);
          expect($($els[0]).attr('value')).to.equal('FA');
          expect($($els[1]).text()).to.equal('Bbb');
        });

        it('has the default selected input field', function () {
          const $el = gie.$container.find('.generic-fieldenums-value > select');
          expect($el).to.have.length(3);
          expect($($el[0]).val()).to.equal('FESLabelb');
          expect($($el[1]).val()).to.equal('FC');
          expect($($el[2]).val()).to.equal('FA');
        });
      });
    });

    describe('Fields and Enums with Arrays to support multiple keys', function () {
      describe('instance', function () {
        let giea: any = null;

        beforeAll(function () {
          giea = new GenericInputFieldEnumsArray({ options_list: [] });
        });

        it('has a template id', function () {
          expect(giea).to.have.property('template_id').and.to.equal('#template-generic-fieldenums');
        });
      });

      describe('rendering', function () {
        let giea: any = null;
        const field_values = {
          testigna: 'FESLabelb',
          testignb: ['FC', 'FD'],
          testignc: ['arrOther', 'FA'],
        };

        beforeAll(function () {
          const $cont = $('<div/>');
          $('#generic-input-render-test').append($cont);
          giea = new GenericInputFieldEnumsArray({
            name: 'arrfes_fieldname',
            field_values: field_values,
            options_list: [
              { label: 'FAaa', value: 'FA' },
              { label: 'Aaa', value: 'arrOther' },
              { label: 'Bbb', value: 'FESLabelb' },
              { label: 'Ccc', value: 'FC' },
              { label: 'Ddd', value: 'FD' },
            ],
            $container: $cont,
          });
          giea.render();
        });

        it('has name data attached', function () {
          const $el = giea.$container.find('.generic-fieldenums-edit');
          expect($el).to.have.length(1);
          expect($el.attr('data-name')).to.equal('arrfes_fieldname');
        });

        it('has the name/label fields duplicated for the arrays', function () {
          const $el = giea.$container.find('.generic-fieldenums-field > input');
          expect($el).to.have.length(5);
          expect($($el[0]).val()).to.equal('testigna');
          expect($($el[1]).val()).to.equal('testignb');
          expect($($el[2]).val()).to.equal('testignb');
          expect($($el[3]).val()).to.equal('testignc');
          expect($($el[4]).val()).to.equal('testignc');
        });

        it('has the select options', function () {
          const $els = giea.$container.find('.generic-fieldenums-value > select > option');
          expect($els.length).to.equal(25);
          expect($($els[0]).attr('value')).to.equal('FA');
          expect($($els[1]).text()).to.equal('Aaa');
        });

        it('has the default selected input field', function () {
          const $el = giea.$container.find('.generic-fieldenums-value > select');
          expect($el).to.have.length(5);
          expect($($el[0]).val()).to.equal('FESLabelb');
          expect($($el[1]).val()).to.equal('FC');
          expect($($el[2]).val()).to.equal('FD');
          expect($($el[3]).val()).to.equal('arrOther');
          expect($($el[4]).val()).to.equal('FA');
        });

        it('doms back to the same object', function () {
          const obj = giea.dom_to_yaml_obj();
          expect(obj).to.have.property('arrfes_fieldname');
          logger('dom to objects', obj.arrfes_fieldname, field_values);
          expect(obj.arrfes_fieldname).to.eql(field_values);
        });

        it('add a new initial entry', function () {
          giea.add_new_entry();
          const $el = giea.$container.find('.generic-fieldenums-value > select');
          expect($el).to.have.length(6);
        });
      });
    });
  });
});
