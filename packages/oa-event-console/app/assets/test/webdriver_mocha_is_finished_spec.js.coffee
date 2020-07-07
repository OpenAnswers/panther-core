
describe 'Mocha is Finished', ->

  it 'creates a div to signal end', ->
    $('html').append $('<div>',id:'mocha-is-finished')
