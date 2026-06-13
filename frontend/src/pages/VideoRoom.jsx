import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Phone,
  Users,
  Monitor
} from 'lucide-react';

const VideoRoom = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [isInCall, setIsInCall] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [localStream, setLocalStream] = useState(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const localVideoRef = useRef(null);
  const peerConnections = useRef(new Map());
  const remoteStreams = useRef(new Map());
  const [remoteVideos, setRemoteVideos] = useState([]);

  const roomId = 'global-video';

  const ICE_SERVERS = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  // Create peer connection for a remote user
  const createPeerConnection = useCallback((remoteSocketId, remoteUser) => {
    if (peerConnections.current.has(remoteSocketId)) {
      return peerConnections.current.get(remoteSocketId);
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local tracks to connection
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('video:ice-candidate', {
          targetSocketId: remoteSocketId,
          candidate: event.candidate
        });
      }
    };

    // Handle remote stream
    pc.ontrack = (event) => {
      const stream = event.streams[0];
      remoteStreams.current.set(remoteSocketId, stream);
      updateRemoteVideos();
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        removePeer(remoteSocketId);
      }
    };

    peerConnections.current.set(remoteSocketId, pc);
    return pc;
  }, [localStream, socket]);

  const updateRemoteVideos = () => {
    const videos = [];
    remoteStreams.current.forEach((stream, socketId) => {
      const participant = participants.find(p => p.socketId === socketId);
      videos.push({
        socketId,
        stream,
        username: participant?.username || 'Unknown'
      });
    });
    setRemoteVideos([...videos]);
  };

  const removePeer = (socketId) => {
    if (peerConnections.current.has(socketId)) {
      peerConnections.current.get(socketId).close();
      peerConnections.current.delete(socketId);
    }
    remoteStreams.current.delete(socketId);
    updateRemoteVideos();
  };

  // Join the video room
  const joinCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      setIsInCall(true);

      if (socket) {
        socket.emit('video:join', {
          roomId,
          user: { id: user.id, username: user.username, avatar: user.avatar }
        });
      }
    } catch (error) {
      console.error('Error accessing media devices:', error);
      alert('Could not access camera/microphone. Please check permissions.');
    }
  };

  // Leave the video room
  const leaveCall = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }

    peerConnections.current.forEach((pc) => pc.close());
    peerConnections.current.clear();
    remoteStreams.current.clear();
    setRemoteVideos([]);
    setParticipants([]);
    setIsInCall(false);

    if (socket) {
      socket.emit('video:leave', { roomId });
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
        if (socket) {
          socket.emit('video:toggle-media', { roomId, type: 'video', enabled: videoTrack.enabled });
        }
      }
    }
  };

  // Toggle audio
  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
        if (socket) {
          socket.emit('video:toggle-media', { roomId, type: 'audio', enabled: audioTrack.enabled });
        }
      }
    }
  };

  // Socket event handlers
  useEffect(() => {
    if (!socket || !isInCall) return;

    // Receive existing participants
    socket.on('video:participants', async (existingParticipants) => {
      setParticipants(existingParticipants);

      // Create offers for all existing participants
      for (const participant of existingParticipants) {
        const pc = createPeerConnection(participant.socketId, participant);
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('video:offer', {
            targetSocketId: participant.socketId,
            offer,
            from: { id: user.id, username: user.username }
          });
        } catch (error) {
          console.error('Error creating offer:', error);
        }
      }
    });

    // New user joined
    socket.on('video:user-joined', (newUser) => {
      setParticipants((prev) => [...prev, newUser]);
    });

    // Receive offer
    socket.on('video:offer', async ({ offer, from }) => {
      const pc = createPeerConnection(from.socketId, from);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('video:answer', {
          targetSocketId: from.socketId,
          answer,
          from: { id: user.id, username: user.username }
        });
      } catch (error) {
        console.error('Error handling offer:', error);
      }
    });

    // Receive answer
    socket.on('video:answer', async ({ answer, from }) => {
      const pc = peerConnections.current.get(from.socketId);
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (error) {
          console.error('Error handling answer:', error);
        }
      }
    });

    // Receive ICE candidate
    socket.on('video:ice-candidate', async ({ candidate, from }) => {
      const pc = peerConnections.current.get(from);
      if (pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
          console.error('Error adding ICE candidate:', error);
        }
      }
    });

    // User left
    socket.on('video:user-left', ({ socketId }) => {
      removePeer(socketId);
      setParticipants((prev) => prev.filter((p) => p.socketId !== socketId));
    });

    return () => {
      socket.off('video:participants');
      socket.off('video:user-joined');
      socket.off('video:offer');
      socket.off('video:answer');
      socket.off('video:ice-candidate');
      socket.off('video:user-left');
    };
  }, [socket, isInCall, createPeerConnection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      peerConnections.current.forEach((pc) => pc.close());
      if (socket && isInCall) {
        socket.emit('video:leave', { roomId });
      }
    };
  }, []);

  return (
    <div className="video-room-page">
      <div className="video-room-header">
        <div className="video-room-title">
          <Monitor size={24} />
          <h2>Global Video Room</h2>
        </div>
        <div className="participant-count">
          <Users size={18} />
          <span>{participants.length + (isInCall ? 1 : 0)} in call</span>
        </div>
      </div>

      {!isInCall ? (
        <div className="video-join-screen">
          <div className="join-content">
            <Video size={64} className="join-icon" />
            <h2>Join the Global Video Room</h2>
            <p>Connect face-to-face with people from around the world</p>
            <button className="join-call-btn" onClick={joinCall}>
              <Phone size={20} />
              <span>Join Call</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="video-call-container">
          <div className="video-grid" data-count={remoteVideos.length + 1}>
            {/* Local video */}
            <div className="video-tile local-video">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className={!isVideoEnabled ? 'video-hidden' : ''}
              />
              {!isVideoEnabled && (
                <div className="video-off-placeholder">
                  <span>{user.username?.charAt(0).toUpperCase()}</span>
                </div>
              )}
              <div className="video-label">
                <span>You ({user.username})</span>
              </div>
            </div>

            {/* Remote videos */}
            {remoteVideos.map(({ socketId, stream, username }) => (
              <RemoteVideo key={socketId} stream={stream} username={username} />
            ))}
          </div>

          {/* Controls */}
          <div className="video-controls">
            <button
              className={`control-btn ${!isAudioEnabled ? 'disabled' : ''}`}
              onClick={toggleAudio}
              title={isAudioEnabled ? 'Mute' : 'Unmute'}
            >
              {isAudioEnabled ? <Mic size={22} /> : <MicOff size={22} />}
            </button>
            <button
              className={`control-btn ${!isVideoEnabled ? 'disabled' : ''}`}
              onClick={toggleVideo}
              title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
            >
              {isVideoEnabled ? <Video size={22} /> : <VideoOff size={22} />}
            </button>
            <button className="control-btn leave-btn" onClick={leaveCall} title="Leave call">
              <PhoneOff size={22} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Remote video component
const RemoteVideo = ({ stream, username }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="video-tile">
      <video ref={videoRef} autoPlay playsInline />
      <div className="video-label">
        <span>{username}</span>
      </div>
    </div>
  );
};

export default VideoRoom;
