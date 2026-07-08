//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
import { describe, it, expect, beforeEach } from 'vitest';

describe('Error Handling', function () {
  describe('DomErrorBase', function () {
    describe('instance', function () {
      it('creates an instance', function () {
        expect(new DomErrorBase()).to.be.an.instanceof(DomErrorBase);
      });

      it('add a message', function () {
        const de = new DomErrorBase('testm');
        expect(de).to.have.property('message').and.to.equal('testm');
      });

      it('adds a friendly message', function () {
        const de = new DomErrorBase('testm', { friendly: 'testfr' });
        expect(de).to.have.property('friendly').and.to.equal('testfr');
      });

      it('add an element', function () {
        const de = new DomErrorBase('testm', { $element: 'testel' });
        expect(de).to.have.property('$element').and.to.equal('testel');
      });
    });
  });

  describe('DomError', function () {
    it('creates a DomError instance', function () {
      expect(new DomError()).to.be.an.instanceof(DomError);
    });

    it('is a DomErrorBase', function () {
      expect(new DomError()).to.be.an.instanceof(DomErrorBase);
    });

    it('has a type', function () {
      expect(new DomError()).to.have.property('type').and.to.equal('error');
    });

    it('has a label', function () {
      expect(new DomError()).to.have.property('label').and.to.equal('Error');
    });
  });

  describe('DomWarning', function () {
    it('creates a DomWarning instance', function () {
      expect(new DomWarning()).to.be.an.instanceof(DomWarning);
    });

    it('is a DomErrorBase', function () {
      expect(new DomWarning()).to.be.an.instanceof(DomErrorBase);
    });

    it('has a type', function () {
      expect(new DomWarning()).to.have.property('type').and.to.equal('warning');
    });

    it('has a label', function () {
      expect(new DomWarning()).to.have.property('label').and.to.equal('Warning');
    });
  });

  describe('DomErrorSet', function () {
    let errors: any = null;

    beforeEach(function () {
      errors = new DomErrorSet();
    });

    describe('setup', function () {
      it('creates an instance', function () {
        expect(errors).to.be.an.instanceof(DomErrorSet);
      });

      it('returns construction defaults', function () {
        expect(errors.defaults()).to.be.an('object');
        expect(errors.defaults()).to.eql({});
      });
    });

    describe('errors', function () {
      it('can return the errors array', function () {
        expect(errors.all_errors()).to.eql([]);
      });

      it('can add an existing error', function () {
        expect(errors.add_error(true)).to.equal(1);
        expect(errors.all_errors()).to.eql([true]);
      });

      it('can generate and add a error', function () {
        expect(errors.add_new_error('danger will robinson')).to.equal(1);
        expect(errors.all_errors()[0]).have.property('message').and.to.eql('danger will robinson');
      });

      it('return ok on no errors', function () {
        expect(errors.ok()).to.be.ok;
      });

      it('return not ok on errors', function () {
        errors.add_error(true);
        expect(errors.ok()).to.not.be.ok;
      });
    });

    describe('warnings', function () {
      it('can return the warnings array', function () {
        expect(errors.all_warnings()).to.eql([]);
      });

      it('can add an existing warning', function () {
        expect(errors.add_warning(true)).to.equal(1);
        expect(errors.all_warnings()).to.eql([true]);
      });

      it('can generate and add a warning', function () {
        expect(errors.add_new_warning('dont')).to.equal(1);
        expect(errors.all_warnings()[0]).have.property('message').and.to.eql('dont');
      });

      it('return ok on warnings', function () {
        expect(errors.add_warning(true)).to.equal(1);
        expect(errors.ok()).to.be.ok;
      });
    });
  });
});
