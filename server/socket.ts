import { Server as SocketIOServer, Socket } from 'socket.io';

interface Participant {
  socketId: string;
  userId: string;
  name: string;
  isAudioMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  joinedAt: number;
}

interface WhiteboardStroke {
  id: string;
  tool: string;
  color: string;
  size: number;
  points: { x: number; y: number }[];
  isEraser?: boolean;
}

interface RoomState {
  participants: Map<string, Participant>;
  whiteboardStrokes: WhiteboardStroke[];
}

const activeRooms = new Map<string, RoomState>();

export function setupSocketIO(io: SocketIOServer) {
  io.on('connection', (socket: Socket) => {
    let currentRoomId: string | null = null;
    let currentUser: { id: string; name: string } | null = null;

    socket.on('room:join', ({ roomId, user, mediaState }: {
      roomId: string;
      user: { id: string; name: string };
      mediaState?: { isAudioMuted?: boolean; isVideoOff?: boolean };
    }) => {
      if (!roomId || !user) return;

      currentRoomId = roomId;
      currentUser = user;

      socket.join(roomId);

      if (!activeRooms.has(roomId)) {
        activeRooms.set(roomId, {
          participants: new Map(),
          whiteboardStrokes: []
        });
      }

      const room = activeRooms.get(roomId)!;
      const participant: Participant = {
        socketId: socket.id,
        userId: user.id,
        name: user.name || 'Guest Participant',
        isAudioMuted: mediaState?.isAudioMuted ?? false,
        isVideoOff: mediaState?.isVideoOff ?? false,
        isScreenSharing: false,
        joinedAt: Date.now()
      };

      // Send current participants to the new user
      const existingParticipants = Array.from(room.participants.values());
      socket.emit('room:peers', {
        participants: existingParticipants,
        whiteboardStrokes: room.whiteboardStrokes
      });

      // Add to room
      room.participants.set(socket.id, participant);

      // Broadcast new user to other participants
      socket.to(roomId).emit('user:joined', { participant });
    });

    // WebRTC Signaling
    socket.on('webrtc:offer', ({ toSocketId, offer }: { toSocketId: string; offer: any }) => {
      io.to(toSocketId).emit('webrtc:offer', {
        fromSocketId: socket.id,
        fromUser: currentUser,
        offer
      });
    });

    socket.on('webrtc:answer', ({ toSocketId, answer }: { toSocketId: string; answer: any }) => {
      io.to(toSocketId).emit('webrtc:answer', {
        fromSocketId: socket.id,
        fromUser: currentUser,
        answer
      });
    });

    socket.on('webrtc:ice-candidate', ({ toSocketId, candidate }: { toSocketId: string; candidate: any }) => {
      io.to(toSocketId).emit('webrtc:ice-candidate', {
        fromSocketId: socket.id,
        candidate
      });
    });

    // Media status toggle (mic, camera, screenshare)
    socket.on('user:media-toggle', ({ roomId, isAudioMuted, isVideoOff, isScreenSharing }: {
      roomId: string;
      isAudioMuted?: boolean;
      isVideoOff?: boolean;
      isScreenSharing?: boolean;
    }) => {
      const room = activeRooms.get(roomId);
      if (room && room.participants.has(socket.id)) {
        const p = room.participants.get(socket.id)!;
        if (typeof isAudioMuted === 'boolean') p.isAudioMuted = isAudioMuted;
        if (typeof isVideoOff === 'boolean') p.isVideoOff = isVideoOff;
        if (typeof isScreenSharing === 'boolean') p.isScreenSharing = isScreenSharing;

        socket.to(roomId).emit('user:media-changed', {
          socketId: socket.id,
          userId: p.userId,
          isAudioMuted: p.isAudioMuted,
          isVideoOff: p.isVideoOff,
          isScreenSharing: p.isScreenSharing
        });
      }
    });

    // Realtime chat message
    socket.on('chat:message', ({ roomId, message }: { roomId: string; message: any }) => {
      if (!roomId || !message) return;
      // Broadcast to all participants in room including sender confirmation
      io.in(roomId).emit('chat:message', { message });
    });

    // Realtime whiteboard drawing stroke
    socket.on('whiteboard:stroke', ({ roomId, stroke }: { roomId: string; stroke: WhiteboardStroke }) => {
      if (!roomId || !stroke) return;
      const room = activeRooms.get(roomId);
      if (room) {
        room.whiteboardStrokes.push(stroke);
        if (room.whiteboardStrokes.length > 2000) {
          room.whiteboardStrokes.shift();
        }
      }
      socket.to(roomId).emit('whiteboard:stroke', { stroke });
    });

    // Clear whiteboard
    socket.on('whiteboard:clear', ({ roomId }: { roomId: string }) => {
      if (!roomId) return;
      const room = activeRooms.get(roomId);
      if (room) {
        room.whiteboardStrokes = [];
      }
      socket.to(roomId).emit('whiteboard:clear');
    });

    // Whiteboard undo stroke
    socket.on('whiteboard:undo', ({ roomId, strokeId }: { roomId: string; strokeId: string }) => {
      if (!roomId) return;
      const room = activeRooms.get(roomId);
      if (room) {
        room.whiteboardStrokes = room.whiteboardStrokes.filter(s => s.id !== strokeId);
      }
      socket.to(roomId).emit('whiteboard:undo', { strokeId });
    });

    // File shared notification
    socket.on('file:shared', ({ roomId, file }: { roomId: string; file: any }) => {
      if (!roomId || !file) return;
      socket.to(roomId).emit('file:shared', { file });
    });

    // Disconnect cleanup
    const handleLeave = () => {
      if (currentRoomId) {
        const room = activeRooms.get(currentRoomId);
        if (room) {
          const participant = room.participants.get(socket.id);
          room.participants.delete(socket.id);

          socket.to(currentRoomId).emit('user:left', {
            socketId: socket.id,
            userId: participant?.userId,
            name: participant?.name
          });

          if (room.participants.size === 0) {
            // Clean up empty room memory after 10 minutes or keep strokes
            setTimeout(() => {
              const r = activeRooms.get(currentRoomId!);
              if (r && r.participants.size === 0) {
                activeRooms.delete(currentRoomId!);
              }
            }, 10 * 60 * 1000);
          }
        }
      }
    };

    socket.on('room:leave', handleLeave);
    socket.on('disconnect', handleLeave);
  });
}
