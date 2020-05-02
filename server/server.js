const express = require('express');
const path = require('path');
const port = process.env.PORT || 49966
const socketIO = require('socket.io');
const http = require('http');
const {generateMessage, generateLocationMessage} = require('./utils/message');

const publicPath = path.join(__dirname, '/../public');
var app = express();
let server = http.createServer(app);
let io = socketIO(server);


app.use(express.static(publicPath));


io.on('connection', (socket)=>{
    console.log('connection is made');

    socket.emit('newMessage', generateMessage('Admin', 'Welcome to the chat app'))

    socket.broadcast.emit('newMessage', generateMessage('Admin', 'New User Joined'))

    socket.on('createMessage', (msg, callback)=>{
        console.log('createMessage', msg);
        io.emit('newMessage', generateMessage(msg.from, msg.text));
        // callback('This is the servee')

    })

    socket.on('createLocationMessage', (coords)=>{
        io.emit('newLocationMessage', generateLocationMessage('Admin', coords.lat, coords.lng))
    })

    socket.on('dissconnect', ()=>{
        console.log('User was disconnected');
    })
})



server.listen(port, ()=>{
    console.log('Server is up...');
})