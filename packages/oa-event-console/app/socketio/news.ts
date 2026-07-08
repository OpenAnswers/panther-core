//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { NewsRequest } = require('../controller/news');
const { SocketIO } = require('../../lib/socketio');

// Client joining the activities stream

SocketIO.route_return('news::read', (socket, data) =>
  NewsRequest.fetch_news().then(result => ({
    data: result,
  }))
);
