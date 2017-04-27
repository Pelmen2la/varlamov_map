'use strict';

var express = require('express'),
    path = require('path'),
    app = express();

global.appRoot = path.resolve(__dirname);


var server = app.listen(process.env.PORT || 3102, 'localhost', function () {
    console.log('App listening on port ' + server.address().port);
});

require('./server/config/index')(app);
require('./server/routes')(app);

process.on('uncaughtException', function(err) {
    console.error(err);
});
