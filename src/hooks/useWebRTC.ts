import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { User } from '../context/AuthContext';

export interface RemoteParticipant {
  socketId: string;
  userId: string;
  name: string;
  stream?: MediaStream;
  isAudioMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  isSpeaking?: boolean;
}

export interface WebRTCProps {
  roomId: string;
  user: User;
  initialAudio?: boolean;
  initialVideo?: boolean;
  onChatMessage?: (msg: any) => void;
  onWhiteboardStroke?: (stroke: any) => void;
  onWhiteboardClear?: () => void;
  onWhiteboardUndo?: (strokeId: string) => void;
  onFileShared?: (file: any) => void;
  onInitialWhiteboardState?: (strokes: any[]) => void;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export function useWebRTC({
  roomId,
  user,
  initialAudio = true,
  initialVideo = true,
  onChatMessage,
  onWhiteboardStroke,
  onWhiteboardClear,
  onWhiteboardUndo,
  onFileShared,
  onInitialWhiteboardState
}: WebRTCProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteParticipants, setRemoteParticipants] = useState<Map<string, RemoteParticipant>>(new Map());
  const [isAudioMuted, setIsAudioMuted] = useState(!initialAudio);
  const [isVideoOff, setIsVideoOff] = useState(!initialVideo);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [activeSpeakerSocketId, setActiveSpeakerSocketId] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const webcamVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const iceCandidatesBuffer = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Audio level analyzer to detect who is speaking
  const setupAudioMonitoring = (stream: MediaStream, socketId: string) => {
    try {
      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack) return;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const source = ctx.createMediaStreamSource(new MediaStream([audioTrack]));
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const checkAudio = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        if (average > 18) {
          setActiveSpeakerSocketId(socketId);
        } else if (activeSpeakerSocketId === socketId) {
          // Keep active speaker brief hysteresis
        }
        animFrameRef.current = requestAnimationFrame(checkAudio);
      };
      checkAudio();
    } catch (e) {
      // Browser audio context policy or missing track
    }
  };

  // Helper to add local tracks to peer connection
  const addTracksToConnection = (pc: RTCPeerConnection) => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getTracks().forEach(track => {
      try {
        pc.addTrack(track, localStreamRef.current!);
      } catch (err) {
        console.warn('Track already added or failed to add:', err);
      }
    });
  };

  // Create an RTCPeerConnection for a remote peer
  const createPeerConnection = useCallback((remoteSocketId: string, participantName: string) => {
    if (peerConnections.current.has(remoteSocketId)) {
      return peerConnections.current.get(remoteSocketId)!;
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnections.current.set(remoteSocketId, pc);

    addTracksToConnection(pc);

    // Remote ICE candidate generated
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('webrtc:ice-candidate', {
          toSocketId: remoteSocketId,
          candidate: event.candidate
        });
      }
    };

    // Remote track arrived
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteStream) {
        setRemoteParticipants(prev => {
          const updated = new Map(prev);
          const current = updated.get(remoteSocketId);
          if (current) {
            updated.set(remoteSocketId, {
              ...current,
              stream: remoteStream
            });
          }
          return updated;
        });
        setupAudioMonitoring(remoteStream, remoteSocketId);
      }
    };

    // Connection state
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        console.log(`Peer ${remoteSocketId} connection state:`, pc.connectionState);
      }
    };

    return pc;
  }, []);

  // Initialize WebRTC and Socket
  useEffect(() => {
    let isCancelled = false;

    async function initMediaAndSocket() {
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          }
        });
      } catch (mediaErr) {
        console.warn('Webcam+Mic access failed or partially available. Trying fallback...', mediaErr);
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        } catch (audioErr) {
          console.warn('Audio access failed. Proceeding without local tracks...', audioErr);
          // Create empty dummy stream so the call can still receive audio/video
          stream = new MediaStream();
        }
      }

      if (isCancelled) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }

      // Configure initial track states
      const audioTrack = stream.getAudioTracks()[0];
      const videoTrack = stream.getVideoTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = initialAudio;
      }
      if (videoTrack) {
        videoTrack.enabled = initialVideo;
        webcamVideoTrackRef.current = videoTrack;
      }

      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsAudioMuted(!initialAudio);
      setIsVideoOff(!initialVideo);

      // Connect Socket.IO
      const socket = io({
        transports: ['websocket', 'polling']
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        setIsConnected(true);
        socket.emit('room:join', {
          roomId,
          user: { id: user.id, name: user.name },
          mediaState: { isAudioMuted: !initialAudio, isVideoOff: !initialVideo }
        });
      });

      // Existing peers in room
      socket.on('room:peers', async ({ participants, whiteboardStrokes }: {
        participants: any[];
        whiteboardStrokes: any[];
      }) => {
        if (onInitialWhiteboardState && whiteboardStrokes) {
          onInitialWhiteboardState(whiteboardStrokes);
        }

        const map = new Map<string, RemoteParticipant>();
        for (const p of participants) {
          if (p.socketId === socket.id) continue;
          map.set(p.socketId, {
            socketId: p.socketId,
            userId: p.userId,
            name: p.name,
            isAudioMuted: p.isAudioMuted ?? false,
            isVideoOff: p.isVideoOff ?? false,
            isScreenSharing: p.isScreenSharing ?? false
          });

          // Create WebRTC connection and initiate offer to existing peer
          const pc = createPeerConnection(p.socketId, p.name);
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit('webrtc:offer', {
              toSocketId: p.socketId,
              offer
            });
          } catch (err) {
            console.error('Failed to create offer for existing peer:', err);
          }
        }
        setRemoteParticipants(map);
      });

      // New user joined
      socket.on('user:joined', ({ participant }: { participant: any }) => {
        setRemoteParticipants(prev => {
          const updated = new Map(prev);
          updated.set(participant.socketId, {
            socketId: participant.socketId,
            userId: participant.userId,
            name: participant.name,
            isAudioMuted: participant.isAudioMuted ?? false,
            isVideoOff: participant.isVideoOff ?? false,
            isScreenSharing: participant.isScreenSharing ?? false
          });
          return updated;
        });
        // Create connection (they will send the offer, or we can await offer)
        createPeerConnection(participant.socketId, participant.name);
      });

      // User media changed
      socket.on('user:media-changed', ({ socketId, isAudioMuted, isVideoOff, isScreenSharing }: any) => {
        setRemoteParticipants(prev => {
          const updated = new Map(prev);
          const p = updated.get(socketId);
          if (p) {
            updated.set(socketId, {
              ...p,
              isAudioMuted: isAudioMuted ?? p.isAudioMuted,
              isVideoOff: isVideoOff ?? p.isVideoOff,
              isScreenSharing: isScreenSharing ?? p.isScreenSharing
            });
          }
          return updated;
        });
      });

      // WebRTC Offer
      socket.on('webrtc:offer', async ({ fromSocketId, fromUser, offer }: any) => {
        const pc = createPeerConnection(fromSocketId, fromUser?.name || 'Participant');
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(offer));

          // Process buffered ICE candidates if any
          const buffered = iceCandidatesBuffer.current.get(fromSocketId) || [];
          for (const cand of buffered) {
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          }
          iceCandidatesBuffer.current.delete(fromSocketId);

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('webrtc:answer', {
            toSocketId: fromSocketId,
            answer
          });
        } catch (err) {
          console.error('Error handling webrtc:offer:', err);
        }
      });

      // WebRTC Answer
      socket.on('webrtc:answer', async ({ fromSocketId, answer }: any) => {
        const pc = peerConnections.current.get(fromSocketId);
        if (pc) {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));

            // Process buffered ICE candidates
            const buffered = iceCandidatesBuffer.current.get(fromSocketId) || [];
            for (const cand of buffered) {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            }
            iceCandidatesBuffer.current.delete(fromSocketId);
          } catch (err) {
            console.error('Error handling webrtc:answer:', err);
          }
        }
      });

      // WebRTC ICE Candidate
      socket.on('webrtc:ice-candidate', async ({ fromSocketId, candidate }: any) => {
        const pc = peerConnections.current.get(fromSocketId);
        if (pc && pc.remoteDescription && pc.remoteDescription.type) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.error('Error adding ICE candidate:', err);
          }
        } else {
          // Buffer candidate
          const list = iceCandidatesBuffer.current.get(fromSocketId) || [];
          list.push(candidate);
          iceCandidatesBuffer.current.set(fromSocketId, list);
        }
      });

      // Chat Message received
      socket.on('chat:message', ({ message }: any) => {
        if (onChatMessage) onChatMessage(message);
      });

      // Whiteboard Stroke received
      socket.on('whiteboard:stroke', ({ stroke }: any) => {
        if (onWhiteboardStroke) onWhiteboardStroke(stroke);
      });

      // Whiteboard Clear received
      socket.on('whiteboard:clear', () => {
        if (onWhiteboardClear) onWhiteboardClear();
      });

      // Whiteboard Undo received
      socket.on('whiteboard:undo', ({ strokeId }: any) => {
        if (onWhiteboardUndo) onWhiteboardUndo(strokeId);
      });

      // File shared received
      socket.on('file:shared', ({ file }: any) => {
        if (onFileShared) onFileShared(file);
      });

      // User Left
      socket.on('user:left', ({ socketId }: { socketId: string }) => {
        const pc = peerConnections.current.get(socketId);
        if (pc) {
          pc.close();
          peerConnections.current.delete(socketId);
        }
        iceCandidatesBuffer.current.delete(socketId);
        setRemoteParticipants(prev => {
          const updated = new Map(prev);
          updated.delete(socketId);
          return updated;
        });
      });
    }

    initMediaAndSocket();

    return () => {
      isCancelled = true;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (screenTrackRef.current) {
        screenTrackRef.current.stop();
      }
      peerConnections.current.forEach(pc => pc.close());
      peerConnections.current.clear();
      if (socketRef.current) {
        socketRef.current.emit('room:leave');
        socketRef.current.disconnect();
      }
    };
  }, [roomId, user.id, user.name, createPeerConnection]);

  // Toggle Microphone
  const toggleAudio = useCallback(() => {
    if (!localStreamRef.current) return;
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      const muted = !audioTrack.enabled;
      setIsAudioMuted(muted);
      if (socketRef.current) {
        socketRef.current.emit('user:media-toggle', {
          roomId,
          isAudioMuted: muted
        });
      }
    }
  }, [roomId]);

  // Toggle Camera
  const toggleVideo = useCallback(() => {
    if (!localStreamRef.current) return;
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      const off = !videoTrack.enabled;
      setIsVideoOff(off);
      if (socketRef.current) {
        socketRef.current.emit('user:media-toggle', {
          roomId,
          isVideoOff: off
        });
      }
    }
  }, [roomId]);

  // Toggle Screen Sharing
  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      // Revert to camera
      if (screenTrackRef.current) {
        screenTrackRef.current.stop();
        screenTrackRef.current = null;
      }
      if (webcamVideoTrackRef.current && localStreamRef.current) {
        const currentVideo = localStreamRef.current.getVideoTracks()[0];
        if (currentVideo) {
          localStreamRef.current.removeTrack(currentVideo);
        }
        localStreamRef.current.addTrack(webcamVideoTrackRef.current);

        // Replace track in peer connections
        peerConnections.current.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender && webcamVideoTrackRef.current) {
            sender.replaceTrack(webcamVideoTrackRef.current);
          }
        });
      }
      setIsScreenSharing(false);
      if (socketRef.current) {
        socketRef.current.emit('user:media-toggle', {
          roomId,
          isScreenSharing: false
        });
      }
    } else {
      // Start screen sharing
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        const screenTrack = displayStream.getVideoTracks()[0];
        screenTrackRef.current = screenTrack;

        screenTrack.onended = () => {
          toggleScreenShare();
        };

        if (localStreamRef.current) {
          const currentVideo = localStreamRef.current.getVideoTracks()[0];
          if (currentVideo) {
            localStreamRef.current.removeTrack(currentVideo);
          }
          localStreamRef.current.addTrack(screenTrack);

          peerConnections.current.forEach(pc => {
            const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
            if (sender) {
              sender.replaceTrack(screenTrack);
            }
          });
        }

        setIsScreenSharing(true);
        if (socketRef.current) {
          socketRef.current.emit('user:media-toggle', {
            roomId,
            isScreenSharing: true
          });
        }
      } catch (err) {
        console.warn('Screen share cancelled or failed:', err);
      }
    }
  }, [isScreenSharing, roomId]);

  // Send Chat message via socket
  const sendChatMessage = useCallback((message: any) => {
    if (socketRef.current) {
      socketRef.current.emit('chat:message', { roomId, message });
    }
  }, [roomId]);

  // Broadcast whiteboard stroke
  const emitWhiteboardStroke = useCallback((stroke: any) => {
    if (socketRef.current) {
      socketRef.current.emit('whiteboard:stroke', { roomId, stroke });
    }
  }, [roomId]);

  // Broadcast whiteboard clear
  const emitWhiteboardClear = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('whiteboard:clear', { roomId });
    }
  }, [roomId]);

  // Broadcast whiteboard undo
  const emitWhiteboardUndo = useCallback((strokeId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('whiteboard:undo', { roomId, strokeId });
    }
  }, [roomId]);

  // Broadcast file shared
  const emitFileShared = useCallback((file: any) => {
    if (socketRef.current) {
      socketRef.current.emit('file:shared', { roomId, file });
    }
  }, [roomId]);

  return {
    socket: socketRef.current,
    localStream,
    remoteParticipants,
    isAudioMuted,
    isVideoOff,
    isScreenSharing,
    isConnected,
    activeSpeakerSocketId,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    sendChatMessage,
    emitWhiteboardStroke,
    emitWhiteboardClear,
    emitWhiteboardUndo,
    emitFileShared
  };
}
