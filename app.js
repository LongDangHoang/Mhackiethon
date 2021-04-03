var express = require('express');
// var firebase = require('firebase/app');
// require('firebase/auth');
var bodyParser = require('body-parser');
var multer = require('multer'); // parse form-datea
var path = require('path');
const {joinUser, removeUser} = require('./user.js');

var app = express();
var http = require('http').createServer(app);
var io = require("socket.io")(http);
// var upload = multer();

// firebase.initialzeApp({
//     apiKey: "AIzaSyA5NhmYW7Q-ftU9hS5a6w9_TQDZXRNjMig",
//     authDomain: "mhackiethon.firebaseapp.com",
//     projectId: "mhackiethon",
//     storageBucket: "mhackiethon.appspot.com",
//     messagingSenderId: "1073593514181",
//     appId: "1:1073593514181:web:b8283c5c1ddcb7f90a18ac"  
// })

// const auth = firebase.auth();

app.use(bodyParser.urlencoded());
// app.use(upload.array());

// set onClick of button to this for sign in
// function signInWithGoogle() {
//     const provider = new firebase.auth.GoogleAuthProvider();
//     auth.signInWithPopup(provider);
// }

// function signOut() {
//     auth.signOut();
// }

let thisRoom = "";
let numClients = {};
io.on("connection", (socket) => {
    console.log("connected");

    // join room event
    socket.on("join room", (data) => {
        console.log("Recieved some info!");
        console.log('in room');
        let newUser = joinUser(socket.id, data.username, data.roomName);
        
        socket.emit('send data', {
            id: socket.id,
            username: newUser.username,
            roomName: newUser.roomName
        });
        thisRoom = newUser.roomName;
        console.log(newUser);
        
        let startTask = false;
        if (numClients[thisRoom] == undefined) {
            numClients[thisRoom] = {
                count: 1,
                user1: newUser
            }
            // send data of waiting
            socket.emit('wait other', {});
        } else {
            numClients[thisRoom].count += 1;
            numClients[thisRoom].user2 = newUser;
            // send data of both users:
            startTask = true;
        }
        socket.join(newUser.roomName);
        if (startTask == true) {
            io.to(thisRoom).emit('start task', {
                user1: numClients[thisRoom].user1,
                user2: numClients[thisRoom].user2
            });
        }
    });
});

app.get('/', (req, res) => {
    res.redirect('/home/');
});

app.use('/home/', express.static(path.join(__dirname, "static/homepage/")));
app.use('/hiit/', express.static(path.join(__dirname, "static/hiit/")));

// app.get('/login/', (req, res) => {
//     res.sendFile(path.join(__dirname, '/static/login/login.html'))
// });

app.post('/connect/', (req, res) => {
    // create user with name and add them to room code
    console.log(req.body);
    var roomName = req.body.rooomName;
});

// app.get('/hiit/', (req, res) => {
    
// });



http.listen(process.env.PORT || 3000);