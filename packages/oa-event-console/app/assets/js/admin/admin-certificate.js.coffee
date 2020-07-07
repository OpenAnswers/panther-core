
debug_admin = debug 'oa:event:console:admin'


# ## AdminCertificate

# Methods for rendering the admin certificate section
# The class is only really for namespacing these methods
# This is largely a copy paste of AdminUser

# Should be a generic Admin class that does most of the grunt work
# Most socket table/edit forms are similar so should be able to setup a
# global generic table renderer

class AdminCertificate
  # ## Event functions

  # ###### send_client_archive()
  @send_client_archive: ( data, cb )->
    debug_admin 'reading client archive', data
    socket.emit 'certificate::client::archive', data, ( err, tarball )->
      debug_admin 'read client archive', tarball
      cb err, tarball if cb

  # ###### gen_blob()
  @gen_blob: ( string, type = 'text/html' )->
    bytes = new Uint8Array(string.length)
    for i in [0...string.length]
      bytes[i] = string.charCodeAt(i)
    new Blob [bytes], type: type

  # ###### save_archive()
  @save_archive: ( data )->
    unless data?
      return Message.error("archive save failed - request incomplete")
    unless data.archive?
      return Message.error("archive save failed - no archive specified")
    components = data.archive.split "-"
    unless components.length == 2
      return Message.error("archive save failed - invalid archive name")
    suffix = if ( components[1] == "linux" ) then ".tar" else ".zip"
    data =
      path: components[0]
      file: components[0].concat("-", components[1], "-client", suffix)
    @send_client_archive data, (err, res)=>
      return Message.error("archive save failed") if err
      confblob = @gen_blob res.client, 'application/binary'
      saveAs confblob, components[0].concat("-config-", components[1], suffix)

$ ->
  # Setup the socket message listeners

  # Select the download
  $('#admin-download-configuration').on 'submit', ( ev )->
    ev.preventDefault()
    # Get the form and turn the fields into an object
    data = {}
    $(ev.target).serializeArray().map ( x )->
      debug 'form', x.name, x.value
      data[x.name] = x.value
    AdminCertificate.save_archive(data)
    false

