let users = [];

function joinUser(socketId, userName, roomName) {
    const user = {
        socketID: socketId,
        username: userName,
        roomName: roomName
    }
    users.push(user)
    return user;
}

function removeUser(id) {
    const getID = users => users.socketID === id;
    const index = users.findIndex(getID);
    if (index !== -1) {
        return users.splice(index, 1)[0];
    }
}

function findRoom(id) {
    // return room of user with id
    const getID = users => users.socketID === id;
    const index =users.findIndex(getID);
    if (index !== -1) {
        return users[index].roomName;
    }
}

module.exports = { joinUser, removeUser, findRoom }