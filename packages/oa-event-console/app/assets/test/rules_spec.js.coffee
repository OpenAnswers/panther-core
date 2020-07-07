
describe 'Rules', ->

  it 'creates an instance', ->
    timer = new Rules
    expect( timer ).to.be.an.instanceof Timer

  it 'can start', ->
    timer = new Timer
    expect( timer.start() ).to.lte Date.now()

  it 'can end', ->
    timer = new Timer
    timer.start()
    end = timer.end()
    expect( end ).to.be.a 'Number'
    expect( end ).to.lte Date.now()


  it 'Timer.start', ->
    timer = Timer.start()
    expect( timer.startTime ).to.lte Date.now()