
var inspect = require( 'util' ).inspect;

var logit = function( obj, cb )
{
  logger.warn( "default action caught with alert(s)" + inspect( obj ) );
  cb( null );
};

module.exports = {
  type: "internal_function",
  command: logit,
  name: 'default'

};

