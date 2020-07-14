let socket = io();
var params = null;
var targetUsername =null;
var myPeerConnection = null;
var target = null;
var mediaConstraints = {
    audio: true, // We want an audio track
    video: true // ...and we want a video track
};
socket.on('connect', ()=>{
    var param = window.location.search.substring(1);
    params = JSON.parse('{"' + decodeURI(param).split('&').join('","').split('+').join(' ').split('=').join('":"') + ' "}');

    socket.emit('join', params, (err)=>{
        if(err){
            alert(err);
            window.location.href = '/';
        }else{
            console.log('No Error');
        }
    });

    console.log('Connected to the server');
});


socket.on('updateUsersList', function(users){
  let ol = document.createElement('ol');
  ol.setAttribute('id', 'users-list');
  var i=0;
  users.forEach(user => {
      let li = document.createElement('li');
      li.setAttribute('id', `user${i}`)
      li.innerHTML = user;
      ol.appendChild(li);
      i++;
  });
  let usersList = document.querySelector('#users');
  usersList.innerHTML = '';
  usersList.appendChild(ol);

  document.querySelector('#users-list').addEventListener('click', ()=>{
      target = event.target;
      invite(target);
  })
  
})

// Handling the invitation
  socket.on('video-offer', (msg)=>{
    console.log('2. Recieved video-offer');
    
    var localStream = null;
    targetUsername = msg.name
    createPeerConnection();
    console.log('3. created peer connection on callee side: ');
    console.log();


    var desc = new RTCSessionDescription(msg.sdp);

    myPeerConnection.setRemoteDescription(desc).then(function () {
        console.log('Getting remote media devices')
        return navigator.mediaDevices.getUserMedia(mediaConstraints);
      })
        .then(function (stream) {  
            localStream = stream;
            document.getElementById('local-video').srcObject = localStream;

            localStream.getTracks().forEach(track => myPeerConnection.addTrack(track, localStream));
        })
        .then(function () {  
            return myPeerConnection.createAnswer();
        })
        .then(function (answer) {  
            myPeerConnection.setLocalDescription(answer);
            var msg = {
                name: params.name,
                target: targetUsername,
                type: 'video-answer',
                sdp: myPeerConnection.localDescription
            };
            console.log('video-answer mypeer connection');
            

            socket.emit('video-answer', msg);
        })
        .catch(handleGetUserMediaError);

})

socket.on('new-ice-candidate', msg=>{
    console.log('recieved newIce Candidate');
    console.log(myPeerConnection);
    
    var candidate = new RTCIceCandidate(msg.candidate);

    myPeerConnection.addIceCandidate(candidate)
        .catch(reportError);
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



document.getElementById("hangup-button").addEventListener('click', hangUpCall);

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
