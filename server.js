const express = require('express');
const path = require('path');
const logger = require('morgan');
const bodyParser = require('body-parser'); 

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended : false}));

const runServer = port => {
    app.listen(port, ()=>{
        console.log(`Port: ${port}`); 
    });
};

module.exports = {runServer, app}; 
