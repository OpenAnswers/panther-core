# Panther Event Console

Front end for the event management system. Turn your data into manageable events

Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
All rights reserved.

## Application Details

The app uses [NodeJS](https://nodejs.org/), [Express4](https://expressjs.com/), [SocketIO](https://socket.io/), [MongoDB](https://www.mongodb.org/) and is written in TypeScript.

[Bluebird](https://bluebirdjs.com) promises ([A+](https://promisesaplus.com/)) are used for asynchronous tasks and error handling.

[PugJS](https://pugjs.org/) templates are used on the server side and some [Mustache](https://mustache.github.io/) is use for client templates. The CSS is written in [Less](https://lesscss.org/).

[connect-assets](https://github.com/adunkman/connect-assets) is use for asset build pipeline to deliver Javascript and CSS to the client.

[d3](https://d3js.org/) and [MetricsGraphics.js](https://metricsgraphicsjs.org/) are used for visualisation

[Mocha](https://mochajs.org/), [Chai](https://chaijs.com/) are used for testing.

## Layout

`app/assets/js` - TypeScript/JS for clients

`app/assets/css` - Less for client css

`app/assets/bower` - Bower installed 3rd party assets (Grunt managed)

`app/view` - Jade templates for express routes

`app/route` - Express HTTP Routes

`app/socketio` - SocketIO message/route handling

`app/email` - Jade Email templates

`app/event` - EventEmitter 2 handlers

`w2ui` - Submodule for w2ui fork

`lib` - Local libraries

`test` - Mocha options and helpers

`test/unit/*_spec.ts` Unit tests.

`test/func/*_spec.ts` Functional tests.
