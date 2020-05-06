let socket = io();
var params = null;
var targetUsername =null;
var myPeerConnection = null;
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
      var target = event.target;
     
      function invite(evt){
          alert(target.innerHTML);
          if(myPeerConnection){
              alert('You can\' start a call because yiou already have one open!!!')
          }else{
              var clickedUsername = target.innerHTML;
              
              if(clickedUsername === params.name){
                  alert("I'm afraid I can\'t let you talk to yourself. That would be weird.");
                  return;
              }

              targetUsername = clickedUsername;
              createPeerConnection();

              navigator.mediaDevices.getUserMedia(mediaConstraints)
              .then(function(localStream){
                  document.getElementById('local-video').srcObject = localStream;
                  localStream.getTracks().forEach(track => myPeerConnection.addTrack(track, localStream));
              })
              .catch(handleGetUserMediaError);
          }
      }
      invite();
  })
  
})

function scrolToBottom() {  
    let messages = document.querySelector('#messages').lastElementChild;
    messages.scrollIntoView();
}


function handleGetUserMediaError(e) {
    switch(e.name) {
      case "NotFoundError":
        alert("Unable to open your call because no camera and/or microphone" +
              "were found.");
        break;
      case "SecurityError":
      case "PermissionDeniedError":
        // Do nothing; this is the same as the user canceling the call.
        break;
      default:
        alert("Error opening your camera and/or microphone: " + e.message);
        break;
    }
  
    closeVideoCall();
  }


function createPeerConnection() {
    myPeerConnection = new RTCPeerConnection({
        iceServers: [     // Information about ICE servers - Use your own!
          {
            urls: "stun:stun1.l.google.com:19302"
          }
        ]
    });

    myPeerConnection.onicecandidate = handleICECandidateEvent;
    myPeerConnection.ontrack = handleTrackEvent;
    myPeerConnection.onnegotiationneeded = handleNegotiationNeededEvent;
    myPeerConnection.onremovetrack = handleRemoveTrackEvent;
    myPeerConnection.oniceconnectionstatechange = handleICEConnectionStateChangeEvent;
    myPeerConnection.onicegatheringstatechange = handleICEGatheringStateChangeEvent;
    myPeerConnection.onsignalingstatechange = handleSignalingStateChangeEvent;
  }


function reportError() {  
    console.log('something wrong');
}
 
function reportError1() {  
    console.log('something wrong from one');
}
 












  
  
  
// NEGOTIATION


function handleNegotiationNeededEvent() {
    myPeerConnection.createOffer().then(function(offer) {
      return myPeerConnection.setLocalDescription(offer);
    })
    .then(function() {
        socket.emit('video-offer', {
            name: params.name,
            target: targetUsername,
            type: "video-offer",
            sdp: myPeerConnection.localDescription
        })
        console.log(targetUsername);
        
    //   sendToServer({
    //     name: myUsername,
    //     target: targetUsername,
    //     type: "video-offer",
    //     sdp: myPeerConnection.localDescription
    //   });
    })
    .catch(reportError);
  }
  

 socket.on('video-offer', (msg)=>{
    var localStream = null;
  
    targetUsername = msg.name;
    createPeerConnection();
  
    var desc = new RTCSessionDescription(msg.sdp);
  
    myPeerConnection.setRemoteDescription(desc).then(function () {
      return navigator.mediaDevices.getUserMedia(mediaConstraints);
    })
    .then(function(stream) {
      localStream = stream;
      document.getElementById("local_video").srcObject = localStream;
  
      localStream.getTracks().forEach(track => myPeerConnection.addTrack(track, localStream));
    })
    .then(function() {
      return myPeerConnection.createAnswer();
    })
    .then(function(answer) {
      return myPeerConnection.setLocalDescription(answer);
    })
    .then(function() {
      var msg = {
        name: myUsername,
        target: targetUsername,
        type: "video-answer",
        sdp: myPeerConnection.localDescription
      };
  
      sendToServer(msg);
    })
    .catch(handleGetUserMediaError);
  })

  
  function handleICECandidateEvent(event) {
    if (event.candidate) {
      sendToServer({
        type: "new-ice-candidate",
        target: targetUsername,
        candidate: event.candidate
      });
    }
  }


  function handleNewICECandidateMsg(msg) {
    var candidate = new RTCIceCandidate(msg.candidate);
  
    myPeerConnection.addIceCandidate(candidate)
      .catch(reportError1);
  }





// ==============================================



function handleTrackEvent(event) {
    document.getElementById("remote-video").srcObject = event.streams[0];
    document.getElementById("hangup-button").disabled = false;
  }





function handleRemoveTrackEvent(event) {
    var stream = document.getElementById("remote-video").srcObject;
    var trackList = stream.getTracks();
   
    if (trackList.length == 0) {
      closeVideoCall();
    }
  }




  
// ENDING CALL
  
function hangUpCall() {
    closeVideoCall();
    sendToServer({
      name: myUsername,
      target: targetUsername,
      type: "hang-up"
    });
  }



function closeVideoCall() {
    var remoteVideo = document.getElementById("remote-video");
    var localVideo = document.getElementById("local-video");
  
    if (myPeerConnection) {
      myPeerConnection.ontrack = null;
      myPeerConnection.onremovetrack = null;
      myPeerConnection.onremovestream = null;
      myPeerConnection.onicecandidate = null;
      myPeerConnection.oniceconnectionstatechange = null;
      myPeerConnection.onsignalingstatechange = null;
      myPeerConnection.onicegatheringstatechange = null;
      myPeerConnection.onnegotiationneeded = null;
  
      if (remoteVideo.srcObject) {
        remoteVideo.srcObject.getTracks().forEach(track => track.stop());
      }
  
      if (localVideo.srcObject) {
        localVideo.srcObject.getTracks().forEach(track => track.stop());
      }
  
      myPeerConnection.close();
      myPeerConnection = null;
    }
  
    remoteVideo.removeAttribute("src");
    remoteVideo.removeAttribute("srcObject");
    localVideo.removeAttribute("src");
    remoteVideo.removeAttribute("srcObject");
  
    document.getElementById("hangup-button").disabled = true;
    targetUsername = null;
  }

  function handleICEConnectionStateChangeEvent(event) {
    switch(myPeerConnection.iceConnectionState) {
      case "closed":
      case "failed":
      case "disconnected":
        closeVideoCall();
        break;
    }
  }
  
  function handleSignalingStateChangeEvent(event) {
    switch(myPeerConnection.signalingState) {
      case "closed":
        closeVideoCall();
        break;
    }
  };


  function handleICEGatheringStateChangeEvent(event) {
    // Our sample just logs information to console here,
    console.log(event);
    
    // but you can do whatever you need.
  }
  
  

//   ===========================================================================================
  




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



// FOR VIDEO CALLING//

