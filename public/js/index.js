let socket = io();
function scrolToBottom() {  
    let messages = document.querySelector('#messages').lastElementChild;
    messages.scrollIntoView();
}



// socket.on('connect', ()=>{
//     console.log('Connected to the server');
// });

// socket.on('disconnect', ()=>{
//     console.log('disconnected from the server');
// });

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

    // const formatedTime = moment(msg.createdAt).format('LT');
    // console.log('newMessage', msg);
    // let li = document.createElement('li');
    // li.innerHTML = `${msg.from} ${formatedTime}: ${msg.text}`

    // document.querySelector('body').appendChild(li);
    document.getElementById("msf-form").reset();
    scrolToBottom();
})

socket.on('newLocationMessage', (msg)=>{


    const formatedTime = moment(msg.createdAt).format('LT');
    // console.log('newLocationMessage', msg);

    // const formatedTime = moment(msg.createdAt).format('LT');
    const temp = document.querySelector('#location-message-temp').innerHTML;
    const html = ejs.render(temp, {
        from: msg.from,
        url: msg.url,
        createdAt: formatedTime
    });

    const div = document.createElement('div');
    div.innerHTML = html;
    document.querySelector('#messages').appendChild(div);

    // let li = document.createElement('li');
    // let a  = document.createElement('a');
    // li.innerHTML = `${msg.from} ${formatedTime}: `

    // a.setAttribute('target', 'blank');
    // a.setAttribute('href', msg.url);
    // a.innerText = 'My current location';
    // li.appendChild(a);
    // // li.innerHTML = `${msg.from}: ${msg.text}`

    // document.querySelector('body').appendChild(li);
    scrolToBottom();
})


document.querySelector('#submit-btn').addEventListener('click', function(e){
    e.preventDefault();
    socket.emit('createMessage', {
        from:" User",
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