// SCROLL THE PAGE TO BOTTOM
function scrolToBottom() {
    let messages = document.querySelector('#messages').lastElementChild;
    messages.scrollIntoView();
}

// Inviting user
function invite(target) {
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


// // Handling getUserMedia() errors
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
}

// REPORTING ERROR
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
}


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

//   HANGUP THE CALL

function hangUpCall() {
    closeVideoCall();
    socket.emit('hangup-Call', {
        name: params.name,
        target: targetUsername,
        type: "hang-up"
    })
}

