OA Errors 
===========

Generic errors to be reused everywhere


`OaError` is the base `Error` that all custom errors extend.

 - `code`
   An error specific code
 - `type`
    An error specific type
 - `field`
    The field the error is associated with
 - `value`
    The value that caused the error
 - `status`
    A HTTP status code. 
 - `simple`
    The simple error message for the user. On the client side, if simple exists
    It should be preferred over `error.message`

`.toObject()`

Creates an object with all fields.

`.toProdObject()`

Creates an object without prod restricted fields. This defaults to removing `stack`.

`.toEnvObject()`

Check's if the Node environment is production/staging or not and runs `.toObject()`
or `.toProdObject()`.

## Errors

- SocketError
- SocketMsgError
- AuthError
- AuthLockedError
- AuthDisabledError
- AuthNotVerifiedError
- HttpError
- ValidationError
- RequestError
- BadRequestError
- NotFoundError
- QueryError
- ErrorGroup
- ValidationGroup
