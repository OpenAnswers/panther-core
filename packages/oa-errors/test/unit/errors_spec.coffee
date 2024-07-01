
# 
# Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  

# logging
debug      = require( 'debug' )( 'oa:test:errors' )

# helpers
{ expect } = require '../mocha_helpers'

# Test setup
Errors = require '../../lib/'

debug 'Errors', Errors
debug 'Errors.SocketError', Errors.SocketError


# instanceof checks don't work with this coffescript inheritence :/

describe 'Errors', ->

  it 'throws SocketError', ->
    fn = -> throw Errors.SocketError
    expect( fn ).to.throw /SocketError/


  it 'throws SocketMsgError', ->
    fn = -> throw Errors.SocketMsgError
    expect( fn ).to.throw /SocketMsgError/


  it 'throws QueryError', ->
    fn = -> throw Errors.QueryError
    expect( fn ).to.throw /QueryError/


  it 'throws NotFoundError', ->
    fn = -> throw Errors.NotFoundError
    expect( fn ).to.throw /NotFoundError/

  it 'throws RequestError', ->
    fn = -> throw Errors.RequestError
    expect( fn ).to.throw /RequestError/

  it 'throws BadRequestError', ->
    fn = -> throw Errors.BadRequestError
    expect( fn ).to.throw /BadRequestError/

  describe 'BadRequestError', ->
    it 'is an error', ->
      expect( new Errors.BadRequestError ).to.be.an.instanceof Error

    it 'throws a BadRequestError', ->
      fn = -> throw Errors.BadRequestError
      expect( fn ).to.throw /BadRequestError/

    it 'throws a BadRequestError with a message', ->
      fn = -> throw new Errors.BadRequestError "booboo"
      expect( fn ).to.throw /BadRequestError: booboo/

  describe 'ValidationError', ->
   
    it 'is an error', ->
      expect( new Errors.ValidationError ).to.be.an.instanceof Error

    it 'throws a ValidationError', ->
      fn = -> throw Errors.ValidationError
      expect( fn ).to.throw /ValidationError/

    it 'should have metadata attached', ->
      e = new Errors.ValidationError "test",
        field: 'what'
        format: 'string'
        code: 234
        type: 'atype'
        value: 'avalue'
      expect( e.field ).to.equal 'what'
      expect( e.format ).to.equal 'string'
      expect( e.code ).to.equal 234
      expect( e.name ).to.equal 'ValidationError'
      expect( e.type ).to.equal 'atype'
      expect( e.value ).to.equal 'avalue'

  it 'throws a ValidationError via helper', ->
    fn = -> Errors.throw_a ValidationError "test", ['a'], ['b']
    expect( fn ).to.throw 'ValidationError'

  it 'throws a CertificateError', ->
    fn = -> throw Errors.CertificateError
    expect( fn ).to.throw /CertificateError/

  it 'throws NotImplementedError', ->
    fn = -> throw Errors.NotImplementedError
    expect( fn ).to.throw /NotImplementedError/
 
  it 'throws EmailError', ->
    fn = -> throw Errors.EmailError
    expect( fn ).to.throw /EmailError/


  describe 'HttpErrors', ->

    it 'throws HttpError400', ->
      fn = -> throw new Errors.HttpError400
      expect( fn ).to.throw /Bad Request/

    it 'throws HttpError400 with message', ->
      fn = -> throw new Errors.HttpError400 "nope"
      expect( fn ).to.throw /Bad Request nope/

    it 'throws HttpError404', ->
      fn = -> throw new Errors.HttpError404
      expect( fn ).to.throw /Not Found/

    it 'throws HttpError404', ->
      fn = -> throw new Errors.HttpError404 "/path/to/missing"
      expect( fn ).to.throw "Not Found /path/to/missing"

    it 'throws HttpError401', ->
      fn = -> throw new Errors.HttpError401
      expect( fn ).to.throw "Unauthorised"

    it 'throws HttpError500', ->
      fn = -> throw new Errors.HttpError500
      expect( fn ).to.throw /Server Error/


  describe 'ErrorType', ->

    it 'can lookup a validation error', ->
      expect( Errors.ErrorType.lookup 'ValidationError' ).to.be.ok

    it 'can create a Validation Error from data', ->
      obj =
        name: 'ValidationError'
        message: 'Whatever message'
        field: 'test'
      error = Errors.ErrorType.from_object obj
      expect( error ).to.be.an.instanceof Errors.ValidationError
      expect( error ).to.have.all.keys ['name','message','field']
      expect( error.name ).to.equal obj.name
      expect( error.message ).to.equal obj.message
      expect( error.field ).to.equal obj.field
       
    it 'defaults to a standard error on string', ->
      error = Errors.ErrorType.from_object "test"
      expect( error ).to.be.an.instanceof Error
      expect( error.message ).to.equal 'test'
      expect( error ).to.not.have.property 'type'


  describe 'ErrorGroup', ->

    it 'can create one', ->
      new Errors.ErrorGroup('a')

    describe 'instance', ->

      eg = null

      beforeEach ->
        eg = new Errors.ErrorGroup 'Whatever'

      it 'adds an error',->
        eg.add new Error('b')
        expect(eg.errors.length).to.equal 1
        expect(eg.errors[0].message).to.equal 'b'

      it 'adds a new error',->
        eg.add_new 'WhatEver', 'This is an error message'
        expect(eg.errors.length).to.equal 1
        expect(eg.errors[0].name).to.equal 'Error'
        expect(eg.errors[0].message).to.equal 'This is an error message'

      it 'counts errors', ->
        eg.add new Error('c')
        expect( eg.count() ).to.equal 1

      it 'throws if there are errors inside', ->
        eg.add new Error('d error')
        fn = -> eg.throw_if_errors()
        expect( fn ).to.throw /Whatever/

      it 'doesnt throws if there aren\'t errors', ->
        fn = -> eg.throw_if_errors()
        expect( fn ).to.not.throw()


  describe 'ValidationGroup', ->

    it 'can create one', ->
      new Errors.ValidationGroup('a')

    describe 'instance', ->

      eg = null

      beforeEach ->
        eg = new Errors.ValidationGroup 'the group'

      it 'throws if there are errors inside', ->
        eg.add new Error('d error')
        fn = -> eg.throw_if_errors()
        expect( fn ).to.throw /ValidationGroup: the group/

      it 'doesnt throws if there aren\'t errors', ->
        fn = -> eg.throw_if_errors()
        expect( fn ).to.not.throw()
