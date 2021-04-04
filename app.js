var express = require('express');
// var firebase = require('firebase/app');
// require('firebase/auth');

let twilioConfig;
try {
    twilioConfig = require('./twilio_config');
    console.log('Successfully load config');
} catch {
    console.log('Instantiating config');
    twilioConfig = {
        accSid: process.env.TWILIO_ACCSID,
        keySid: process.env.TWILIO_KEYSID,
        accSecret: process.env.TWILIO_ACCSECRET,
        keySecret: process.env.TWILIO_KEYSECRET
    }
} finally {
    console.log('Account SID is %s', twilioConfig.accSid);
}

var twilio = require('twilio')(twilioConfig.accSid, twilioConfig.accSecret);
var AccessToken = require('twilio').jwt.AccessToken;
var VideoGrant = AccessToken.VideoGrant;

var bodyParser = require('body-parser');
var path = require('path');
const {joinUser, removeUser, findRoom} = require('./user.js');

var app = express();
var http = require('http').createServer(app);
var io = require("socket.io")(http);

function createTwilioToken(username, roomName) {
    const token = new AccessToken(
        twilioConfig.accSid, 
        twilioConfig.keySid, 
        twilioConfig.keySecret,
        {
            identity: username,
            ttl: 14400
        });
    const grant = new VideoGrant({room: roomName});
    token.addGrant(grant);
    console.log("Access token for user %s is %s", username, token.toJwt());
    return token.toJwt();
}

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
let roomData = {};

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
        if (roomData[thisRoom] == undefined) {
            roomData[thisRoom] = {
                taskNumber: 1, // which task 
                taskProgress: 0, // how many people have completed task
                count: 1,
                user1: newUser
            }
            // send data of waiting
            socket.emit('wait other', {});

        } else if (roomData[thisRoom].user2 == undefined) {
            roomData[thisRoom].count += 1;
            roomData[thisRoom].user2 = newUser;
            // send data of both users:
            startTask = true;
        } else {
            return;
        }

        socket.join(newUser.roomName);
        if (startTask == true) {
        // initialize a twilio room video call            
            console.log('Twilio is running');
            twilio.video.rooms.create({
                uniqueName: thisRoom + String(Math.floor(Date.now() / 1000)),
                type: 'go'
            }).then(room => {
                    console.log("Room created: " + String(room.sid));
                    socket.emit('start call', {
                        roomID: room.sid,
                        accToken: createTwilioToken(newUser.username, room.sid)
                    });
                    // send to friend as well
                    socket.broadcast.to(roomData[thisRoom].user1.socketID).emit('start call', {
                        roomID: room.sid,
                        accToken: createTwilioToken(roomData[thisRoom].user1.username, room.sid)
                    });
                    // record twilio room in socket room
                    roomData[thisRoom].roomID = room.sid;

                    io.to(thisRoom).emit('start task', {
                        taskNumber: roomData[thisRoom].taskNumber,
                        user1: roomData[thisRoom].user1,
                        user2: roomData[thisRoom].user2
                    });
            });

            // io.to(thisRoom).emit('start task', {
            //     taskNumber: roomData[thisRoom].taskNumber,
            //     user1: roomData[thisRoom].user1,
            //     user2: roomData[thisRoom].user2
            // });
        }
            
    });

    // task events
    socket.on("complete task", (data) => {
        // extract vars
        let username = data.username;
        let roomName = data.roomName;
        let socketID = data.id;

        let taskProgress = roomData[roomName].taskProgress;
        let user1 = roomData[roomName].user1;
        let user2 = roomData[roomName].user2;

        if (taskProgress == 0) {
            roomData[roomName].taskProgress += 1;
            // find friend id
            if (user1.socketID == socketID)
                socket.broadcast.to(user2.socketID).emit("other complete task", {});
            else
                socket.broadcast.to(user1.socketID).emit("other complete task", {});
        } else {
            roomData[roomName].taskProgress = 0;
            roomData[roomName].taskNumber += 1; // move on to next task
            if (roomData[roomName].taskNumber > 3) {
                io.to(roomName).emit('all complete', {});
            } else {
                io.to(roomName).emit('start task', {
                    taskNumber: roomData[roomName].taskNumber,
                    user1: user1,
                    user2: user2
                });
            }
        }

    });

    // end
    socket.on('end', (data) => {
        socket.disconnect();
    });

    socket.on('disconnect', () => {
        roomName = findRoom(socket.id);
        if (roomName == undefined) {
            console.log("roomName is undefined for some reason");
        }
        console.log("User %s disconnects!", socket.id);
        if (roomData[roomName] != undefined) {
            twilio.video.rooms(roomData[roomName].roomID)
                        .update({status: 'completed'});
        } else {
            // roomData[roomName] = undefined;
            delete roomData[roomName];
        }
        removeUser(socket.id);
    });

});

app.get('/', (req, res) => {
    console.log('Account id for twilio is %s', twilioConfig.accSid);
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
    if (roomData[req.room] != undefined)
        if (roomData[req.room].user2 != undefined)
            res.send("Only two people can use this workout adventure at any time!");
});

// app.get('/hiit/', (req, res) => {
    
// });



http.listen(process.env.PORT || 3000);