const express = require('express');
const path = require('path');
const port = process.env.PORT || 49966
const socketIO = require('socket.io');
const http = require('http');
const {generateMessage, generateLocationMessage } = require('./utils/message');
const {isRealString} = require('./utils/isRealString')
const {Users}  = require('./utils/users')



const publicPath = path.join(__dirname, '/../public');
var app = express();
let server = http.createServer(app);
let io = socketIO(server);
let users = new Users();

app.use(express.static(publicPath));


io.on('connection', (socket)=>{
    console.log('connection is made');

    
    socket.on('join', (params, callback)=>{
        if(!(isRealString(params.name)) || !(isRealString(params.room))){
            return callback("Name and Room are required")
        }
        socket.join(params.room);

        users.removeUser(socket.id);
        users.addUsers(socket.id, params.name, params.room);

        io.to(params.room).emit('updateUsersList', users.getUserList(params.room));

        socket.emit('newMessage', generateMessage('Admin', `${params.name}, Welcome to the ChatApp`))

        socket.broadcast.to(params.room).emit('newMessage', generateMessage('Admin', `${params.name} Joined`))

        callback();
    })

    socket.on('video-offer', (msg)=>{
        var ID = null;
        // alert(msg.name);
        users.users.forEach(element=> {
            if(element.name === msg.target){
                ID = element.id;
            }
        });
        console.log(msg.target);
        socket.broadcast.to(ID).emit('video-offer', msg);
    })

    socket.on('video-answer', msg=>{
        var ID = null;
        // alert(msg.name);
        users.users.forEach(element=> {
            if(element.name === msg.target){
                ID = element.id;
            }
        });
        console.log(msg.target);
        socket.broadcast.to(ID).emit('video-answer', msg);
    })

    socket.on('createMessage', (msg)=>{
        let user = users.getUser(socket.id);

        if(user && isRealString(msg.text)){
            io.to(user.room).emit('newMessage', generateMessage(user.name, msg.text));

        }


    })

    socket.on('createLocationMessage', (coords)=>{

        let user = users.getUser(socket.id);

        if(user){
            io.to(user.room).emit('newLocationMessage', generateLocationMessage(user.name, coords.lat, coords.lng))
        }

    })

    socket.on('disconnect', ()=>{
        let user = users.removeUser(socket.id);
        
        if(user){
            io.to(user.room).emit('updateUsersList', users.getUserList(user.room));
            io.to(user.room).emit('newMessage', generateMessage('Admin', `${user.name} has left ${user.room}`))
        }
    })
})



server.listen(port, ()=>{
    console.log('Server is up...');
})