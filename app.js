var express = require('express');
var path = require('path');
var app = express();

app.use(express.static("static"));

// app.get('/', (req, res) => {

// })

app.listen(3000);