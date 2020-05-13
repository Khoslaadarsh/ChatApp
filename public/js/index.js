let socket = io();
var params = null;
var targetUsername =null;
var myPeerConnection = null;
var mediaConstraints = {
    audio: true, // We want an audio track
    video: true // ...and we want a video track
};
function scrolToBottom() {
    let messages = document.querySelector('#messages').lastElementChild;
    messages.scrollIntoView();
}

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
     
      function invite(evt) {  
        alert(target.innerHTML);
        if(myPeerConnection){
            alert('You can\'t start a call because you are already have one open! ');
        }else{
            var clickedUsername = target.innerHTML;
            if(clickedUsername === params.name){
                alert(" I'm afraid I can't let you talk to yourself. That would be weird.");
                return;
            }

            targetUsername = clickedUsername;
            createPeerConnection();

            navigator.mediaDevices.getUserMedia(mediaConstraints)
                .then((localStream)=>{
                    document.querySelector('#local-video').srcObject = localStream;
                    localStream.getTracks().forEach(track => myPeerConnection.addTrack(track, localStream));
                })
                .catch(handleGetUserMediaError);
        }
    }
      invite();
  })
  
})




// Handling getUserMedia() errors
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


// Creating peer connection
function createPeerConnection() {
    myPeerConnection = new RTCPeerConnection({
        iceServers: [     // Information about ICE servers - Use your own!
          {
            urls: ["stun:stun1.l.google.com:19302"]
          }
        ]
    });

    myPeerConnection.onicecandidate = handleICECandidateEvent;
    myPeerConnection.ontrack = handleTrackEvent;
    myPeerConnection.onnegotiationneeded = handleNegotiationNeededEvent;
    myPeerConnection.onremovetrack = handleRemoveTrackEvent;
    myPeerConnection.onconnectionstatechange = ()=>{
        console.log('CONNECTION ESTABLISHED....................................................................');
        
    }
    myPeerConnection.oniceconnectionstatechange = handleICEConnectionStateChangeEvent;
    myPeerConnection.onicegatheringstatechange = handleICEGatheringStateChangeEvent;
    myPeerConnection.onsignalingstatechange = handleSignalingStateChangeEvent;
    // mypeerConnection.addEventListener('connectionstatechange', event => {
    //     if (event.connectionState === 'connected') {
    //         console.log('Peers connected');
    //         // Peers connected!
    //     }
    // });
}


function reportError() {  
    console.log('something wrong');
}












  
  
  
// NEGOTIATION

// handleNegotiationNeededEvent
function handleNegotiationNeededEvent() {
    console.log('myPeerConnection-> at handleNegotiationNeededEvent:  ');
    console.log(myPeerConnection);


    socket.on('video-answer', async msg=>{
        if(msg.type){
            console.log('recieving video-answer');
            console.log(msg);
            
            const remoteDesc = new RTCSessionDescription(msg.sdp);
            await myPeerConnection.setRemoteDescription(remoteDesc);
        }
        
    });
    



    myPeerConnection.createOffer().then(function(offer) {
      return myPeerConnection.setLocalDescription(offer);
    })
    .then(function() {
        console.log('1.sending video-offer');
        socket.emit('video-offer', {
            name: params.name,
            target: targetUsername,
            type: "video-offer",
            sdp: myPeerConnection.localDescription
        })
    })
    .catch(reportError);
  }
  
// Handling the invitation
  socket.on('video-offer', (msg)=>{
    console.log('2. Recieved video-offer');
    
    var localStream = null;
    targetUsername = msg.name
    createPeerConnection();
    console.log('3. created peer connection on callee side: ');
    console.log();
    
    
    // msg.sdp.sdp += '\n';



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


  function handleICECandidateEvent(event) {
      console.log('myPeerConnection from handleICECandidateEvent')
      console.log(myPeerConnection)
    //  MyPeerConnection = myPeerConnection;
    if (event.candidate) {
        socket.emit('new-ice-candidate', {
            type: "new-ice-candidate",
            target: targetUsername,
            candidate: event.candidate,
            myPeerConnection: myPeerConnection
        })
    }
    // socket.on('new-ice-candidate', msg=>{
    //     console.log('recieved newIce Candidate');
    //     console.log(msg);
        
    //     var candidate = new RTCIceCandidate(msg.candidate);
    
    //     myPeerConnection.addIceCandidate(candidate)
    //         .catch(reportError);
    // })
  }


//   socket.on('handleNewICECandidateMsg',(msg) =>{
//     var candidate = new RTCIceCandidate(msg.candidate);
  
//     myPeerConnection.addIceCandidate(candidate)
//       .catch(reportError1);
//   })



socket.on('new-ice-candidate', msg=>{
    console.log('recieved newIce Candidate');
    console.log(myPeerConnection);
    
    var candidate = new RTCIceCandidate(msg.candidate);

    myPeerConnection.addIceCandidate(candidate)
        .catch(reportError);
})

// ==============================================



function handleTrackEvent(event) {
    console.log('settingup REMOTE video');
    console.log(event.streams[0]);
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



// Hnaging UP
document.getElementById("hangup-button").addEventListener('click', hangUpCall);

function hangUpCall() {
    closeVideoCall();
    socket.emit('hangup-Call', {
        name: params.name,
        target: targetUsername,
        type: "hang-up"
    })
}


// Closevideo Ending the call
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
  
    // document.getElementById("hangup-button").disabled = true;
    targetUsername = null;
  }
//   IceConnectionStagechange
function handleICEConnectionStateChangeEvent(event) {
    switch(myPeerConnection.iceConnectionState) {
      case "closed":
      case "failed":
      case "disconnected":
        closeVideoCall();
        break;
    }
  }

// ICE signaling state
function handleSignalingStateChangeEvent(event) {
    switch(myPeerConnection.signalingState) {
      case "closed":
        closeVideoCall();
        break;
    }
};
// Ice gathering event
function handleICEGatheringStateChangeEvent(event) {
    console.log('event');
    console.log(event);
    
    // Our sample just logs information to console here,
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

