///<reference path="../typings/node/node.d.ts" />
///<reference path="../typings/express/express.d.ts" />
///<reference path="betfair.ts" />

import express = require('express');
import path = require('path');
import bf = require('./Betfair');
var betfairFactory = new bf.BetfairServiceFactory();
var betfair = betfairFactory.getService(process.env.APP_KEY, process.env.USER_NAME, process.env.PASSWORD);

betfair.login((success)=>{
    if (!success) {
        console.info('Can\'t log in to the betfair api. Stopping the application.');
        process.exit(1);
    }
});

var app = express();
app.set('port', (process.env.PORT || 3000));
app.use('/', express.static(path.join(__dirname, '../client')));
app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname + '/../client/home/index.html'));
});


// Get all the available sports filter by the ones that we're actually going to use
app.get('/api/v2/getAllSports', function(req, res) {
    betfair.getEventTypes((success, eventTypes) => {
        if(success){
            res.status(200).type('application/json').send(JSON.stringify(eventTypes));
        } 
        else {
            res.sendStatus(500);
        }
    });
});


app.listen(app.get('port'), function() {
    console.log('Server started on http://localhost:' + app.get('port'));
});