let socket = io();

function scrolToBottom() {  
    let messages = document.querySelector('#messages').lastElementChild;
    messages.scrollIntoView();
}



socket.on('connect', ()=>{
    var param = window.location.search.substring(1);
    var params = JSON.parse('{"' + decodeURI(param).split('&').join('","').split('+').join(' ').split('=').join('":"') + ' "}');

    socket.emit('join', params, (err)=>{
        if(err){
            alert(err);
            window.location.href = '/';
        }else{
            console.log('No Error');
        }
    })
    console.log('Connected to the server');
});

socket.on('updateUsersList', function(users){
    let ol = document.createElement('ol');
    
    users.forEach(user => {
        let li = document.createElement('li');
        li.innerHTML = user;
        ol.appendChild(li);
    });

    let usersList = document.querySelector('#users');
    usersList.innerHTML = '';
    usersList.appendChild(ol);
    
})



socket.on('newMessage', (msg)=>{
    const formatedTime = moment(msg.createdAt).format('LT');
    const temp = document.querySelector('#message-temp').innerHTML;
    const html = ejs.render(temp, {
        from: msg.from,
        text: msg.text,
        createdAt: formatedTime
    });
  
    const div = document.createElement('div');
    div.innerHTML = html;
    document.querySelector('#messages').append(div);
    document.getElementById("msf-form").reset();
    scrolToBottom();
})

socket.on('newLocationMessage', (msg)=>{


    const formatedTime = moment(msg.createdAt).format('LT');
    const temp = document.querySelector('#location-message-temp').innerHTML;
    const html = ejs.render(temp, {
        from: msg.from,
        url: msg.url,
        createdAt: formatedTime
    });

    const div = document.createElement('div');
    div.innerHTML = html;
    document.querySelector('#messages').appendChild(div);
    scrolToBottom();
})


document.querySelector('#submit-btn').addEventListener('click', function(e){
    e.preventDefault();
    socket.emit('createMessage', {
        text: document.querySelector('input[name="message"]').value
    }, )

});

document.querySelector('#send-location').addEventListener('click', function(e){
    if(!navigator.geolocation){
        return alert('Geolocation is not supported by your browser.');
    }
    else{
        navigator.geolocation.getCurrentPosition(function(pos){
            socket.emit('createLocationMessage', {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude
            })
        }, function () {  
            alert('Unable to fetch location.')
        })
    }
})