import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MessageSquare,
  FileText,
  Palette,
  Users,
  PhoneOff,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  Grid,
  Layout,
  Shield,
  X,
  Lock
} from 'lucide-react';
import { User } from '../../context/AuthContext';
import { useWebRTC } from '../../hooks/useWebRTC';
import { VideoTile } from './VideoTile';
import { ChatPanel, ChatMessage } from './ChatPanel';
import { FileList, SharedFile } from './FileList';
import { Whiteboard, StrokeData } from './Whiteboard';
import { ParticipantsList } from './ParticipantsList';

interface MeetingRoomProps {
  roomId: string;
  roomTitle?: string;
  user: User;
  initialAudio?: boolean;
  initialVideo?: boolean;
  roomPasskey?: string;
  onLeave: () => void;
}

type ActivePanel = 'none' | 'chat' | 'files' | 'whiteboard' | 'participants';

export const MeetingRoom: React.FC<MeetingRoomProps> = ({
  roomId,
  roomTitle = 'Meeting',
  user,
  initialAudio = true,
  initialVideo = true,
  roomPasskey = '',
  onLeave
}) => {
  const [activePanel, setActivePanel] = useState<ActivePanel>('none');
  const [viewMode, setViewMode] = useState<'grid' | 'speaker'>('grid');
  const [pinnedSocketId, setPinnedSocketId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [sharedFiles, setSharedFiles] = useState<SharedFile[]>([]);
  const [whiteboardStrokes, setWhiteboardStrokes] = useState<StrokeData[]>([]);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const showToast = useCallback((msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification((curr) => (curr === msg ? null : curr));
    }, 3000);
  }, []);

  // WebRTC & Socket hook
  const {
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
  } = useWebRTC({
    roomId,
    user,
    initialAudio,
    initialVideo,
    onChatMessage: (msg) => {
      setChatMessages((prev) => [...prev, msg]);
      if (activePanel !== 'chat') {
        setUnreadChatCount((prev) => prev + 1);
      }
    },
    onWhiteboardStroke: (stroke) => {
      setWhiteboardStrokes((prev) => [...prev, stroke]);
    },
    onWhiteboardClear: () => {
      setWhiteboardStrokes([]);
      showToast('Whiteboard was cleared');
    },
    onWhiteboardUndo: (strokeId) => {
      setWhiteboardStrokes((prev) => prev.filter((s) => s.id !== strokeId));
    },
    onFileShared: (file) => {
      setSharedFiles((prev) => [file, ...prev]);
      showToast(`New file shared: ${file.fileName}`);
    },
    onInitialWhiteboardState: (strokes) => {
      setWhiteboardStrokes(strokes || []);
    }
  });

  // Load existing room files on mount
  useEffect(() => {
    async function loadRoomFiles() {
      try {
        const res = await fetch(`/api/files/room/${roomId}`);
        if (res.ok) {
          const data = await res.json();
          setSharedFiles(data.files || []);
        }
      } catch (err) {
        console.error('Failed to load room files:', err);
      }
    }
    loadRoomFiles();
  }, [roomId]);

  // Reset unread count when opening chat
  useEffect(() => {
    if (activePanel === 'chat') {
      setUnreadChatCount(0);
    }
  }, [activePanel]);

  const remotesList = useMemo(() => Array.from(remoteParticipants.values()), [remoteParticipants]);
  const totalParticipants = 1 + remotesList.length;

  // Determine active speaker / screen sharer for speaker mode
  const effectiveSpeakerSocketId = useMemo(() => {
    if (pinnedSocketId) return pinnedSocketId;
    // Check if any remote is sharing screen
    const screenSharer = remotesList.find((p) => p.isScreenSharing);
    if (screenSharer) return screenSharer.socketId;
    if (isScreenSharing) return 'local';
    if (activeSpeakerSocketId) return activeSpeakerSocketId;
    if (remotesList.length > 0) return remotesList[0].socketId;
    return 'local';
  }, [pinnedSocketId, remotesList, isScreenSharing, activeSpeakerSocketId]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleCopyInvite = () => {
    const url = `${window.location.origin}/#room=${roomId}${roomPasskey ? `&key=${encodeURIComponent(roomPasskey)}` : ''}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    showToast('Meeting link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleLocalFileUploaded = (file: SharedFile) => {
    setSharedFiles((prev) => [file, ...prev]);
    emitFileShared(file);
    showToast(`Shared "${file.fileName}" with meeting`);
  };

  // Video Grid layout calculations
  const getGridClasses = (count: number) => {
    if (count === 1) return 'grid-cols-1 max-w-4xl mx-auto h-full';
    if (count === 2) return 'grid-cols-1 md:grid-cols-2 max-w-5xl mx-auto h-full';
    if (count <= 4) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 h-full';
    if (count <= 6) return 'grid-cols-2 md:grid-cols-3 h-full';
    return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 h-full';
  };

  return (
    <div className="fixed inset-0 bg-slate-950 text-slate-100 flex flex-col overflow-hidden select-none">
      {/* Toast Notification */}
      {notification && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-slate-800/95 border border-slate-700 text-slate-100 text-xs shadow-2xl backdrop-blur-md animate-fade-in flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="h-14 px-4 bg-slate-950/90 border-b border-slate-800/80 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-base tracking-tight">ConnectSpace</span>
            <span className="text-slate-600">/</span>
            <span className="text-xs font-semibold text-slate-300 max-w-[180px] sm:max-w-xs truncate">
              {roomTitle}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-400 font-mono">
            <span>{roomId}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status badge */}
          <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="text-slate-300 font-medium">{isConnected ? 'Connected' : 'Connecting...'}</span>
          </div>

          {/* E2EE badge */}
          {roomPasskey && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/50 border border-emerald-800/60 text-emerald-400 text-xs font-mono">
              <Lock className="w-3 h-3" />
              <span>E2EE Active</span>
            </div>
          )}

          {/* Invite button */}
          <button
            onClick={handleCopyInvite}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-200 transition-colors"
            title="Copy meeting invite link"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span className="hidden sm:inline">{copiedLink ? 'Copied' : 'Invite'}</span>
          </button>

          {/* Layout Mode switch */}
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'speaker' : 'grid')}
            className={`p-2 rounded-xl border transition-colors ${
              viewMode === 'speaker'
                ? 'bg-indigo-600 text-white border-indigo-500'
                : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800 hover:bg-slate-850'
            }`}
            title={viewMode === 'grid' ? 'Switch to Spotlight View' : 'Switch to Grid View'}
          >
            {viewMode === 'grid' ? <Layout className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-slate-800 hover:bg-slate-800 transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Workspace (Video Area + Collapsible Right Drawer) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Video / Whiteboard Stage */}
        <div className="flex-1 p-3 sm:p-4 overflow-hidden flex flex-col justify-center items-center relative">
          {viewMode === 'grid' ? (
            /* Grid View */
            <div className={`grid gap-3 sm:gap-4 w-full ${getGridClasses(totalParticipants)}`}>
              {/* Local User Tile */}
              <VideoTile
                stream={localStream}
                name={user.name}
                isLocal={true}
                isAudioMuted={isAudioMuted}
                isVideoOff={isVideoOff}
                isScreenSharing={isScreenSharing}
                isPinned={pinnedSocketId === 'local'}
                onTogglePin={() => setPinnedSocketId(pinnedSocketId === 'local' ? null : 'local')}
              />

              {/* Remote Participants */}
              {remotesList.map((peer) => (
                <VideoTile
                  key={peer.socketId}
                  stream={peer.stream}
                  name={peer.name}
                  isLocal={false}
                  isAudioMuted={peer.isAudioMuted}
                  isVideoOff={peer.isVideoOff}
                  isScreenSharing={peer.isScreenSharing}
                  isSpeaking={activeSpeakerSocketId === peer.socketId}
                  isPinned={pinnedSocketId === peer.socketId}
                  onTogglePin={() =>
                    setPinnedSocketId(pinnedSocketId === peer.socketId ? null : peer.socketId)
                  }
                />
              ))}
            </div>
          ) : (
            /* Speaker / Spotlight Mode */
            <div className="w-full h-full flex flex-col gap-3">
              {/* Main Spotlight Video */}
              <div className="flex-1 rounded-2xl overflow-hidden relative">
                {effectiveSpeakerSocketId === 'local' ? (
                  <VideoTile
                    stream={localStream}
                    name={user.name}
                    isLocal={true}
                    isAudioMuted={isAudioMuted}
                    isVideoOff={isVideoOff}
                    isScreenSharing={isScreenSharing}
                    className="w-full h-full"
                  />
                ) : (
                  (() => {
                    const peer = remoteParticipants.get(effectiveSpeakerSocketId);
                    if (!peer) return null;
                    return (
                      <VideoTile
                        stream={peer.stream}
                        name={peer.name}
                        isLocal={false}
                        isAudioMuted={peer.isAudioMuted}
                        isVideoOff={peer.isVideoOff}
                        isScreenSharing={peer.isScreenSharing}
                        isSpeaking={activeSpeakerSocketId === peer.socketId}
                        className="w-full h-full"
                      />
                    );
                  })()
                )}
              </div>

              {/* Filmstrip of other participants at bottom */}
              <div className="h-28 flex items-center gap-3 overflow-x-auto pb-1 shrink-0">
                {effectiveSpeakerSocketId !== 'local' && (
                  <div
                    onClick={() => setPinnedSocketId('local')}
                    className="w-36 h-full shrink-0 cursor-pointer"
                  >
                    <VideoTile
                      stream={localStream}
                      name={user.name}
                      isLocal={true}
                      isAudioMuted={isAudioMuted}
                      isVideoOff={isVideoOff}
                      className="w-full h-full text-xs"
                    />
                  </div>
                )}

                {remotesList
                  .filter((p) => p.socketId !== effectiveSpeakerSocketId)
                  .map((peer) => (
                    <div
                      key={peer.socketId}
                      onClick={() => setPinnedSocketId(peer.socketId)}
                      className="w-36 h-full shrink-0 cursor-pointer"
                    >
                      <VideoTile
                        stream={peer.stream}
                        name={peer.name}
                        isLocal={false}
                        isAudioMuted={peer.isAudioMuted}
                        isVideoOff={peer.isVideoOff}
                        isSpeaking={activeSpeakerSocketId === peer.socketId}
                        className="w-full h-full text-xs"
                      />
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Collapsible Panel */}
        {activePanel !== 'none' && (
          <aside className="w-80 sm:w-96 bg-slate-900 border-l border-slate-800 flex flex-col z-30 shrink-0 h-full">
            {/* Panel Title Bar */}
            <div className="h-12 px-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-200 capitalize">
                {activePanel === 'whiteboard' ? 'Collaborative Whiteboard' : activePanel}
              </span>
              <button
                onClick={() => setActivePanel('none')}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Close panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Panel Content Body */}
            <div className="flex-1 overflow-hidden">
              {activePanel === 'chat' && (
                <ChatPanel
                  roomId={roomId}
                  user={user}
                  messages={chatMessages}
                  roomPasskey={roomPasskey}
                  onSendMessage={sendChatMessage}
                />
              )}

              {activePanel === 'files' && (
                <FileList
                  roomId={roomId}
                  user={user}
                  files={sharedFiles}
                  onFileUploaded={handleLocalFileUploaded}
                />
              )}

              {activePanel === 'whiteboard' && (
                <Whiteboard
                  strokes={whiteboardStrokes}
                  onEmitStroke={emitWhiteboardStroke}
                  onEmitClear={emitWhiteboardClear}
                  onEmitUndo={emitWhiteboardUndo}
                />
              )}

              {activePanel === 'participants' && (
                <ParticipantsList
                  currentUser={user}
                  isLocalAudioMuted={isAudioMuted}
                  isLocalVideoOff={isVideoOff}
                  isLocalScreenSharing={isScreenSharing}
                  remoteParticipants={remoteParticipants}
                  activeSpeakerSocketId={activeSpeakerSocketId}
                />
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Bottom Floating Control Bar */}
      <footer className="h-20 bg-slate-950/95 border-t border-slate-800/80 px-4 flex items-center justify-between z-40 shrink-0">
        {/* Left info */}
        <div className="hidden md:flex items-center gap-3 w-1/4">
          <div className="text-xs text-slate-400">
            <span className="font-semibold text-slate-200">{user.name}</span>
            <span className="mx-1.5 text-slate-600">·</span>
            <span className="font-mono">{roomId}</span>
          </div>
        </div>

        {/* Center Primary Controls */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 flex-1">
          {/* Mic */}
          <button
            onClick={toggleAudio}
            className={`p-3.5 rounded-2xl border transition-all ${
              isAudioMuted
                ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-950/40'
                : 'bg-slate-800/90 hover:bg-slate-700 text-slate-100 border-slate-700'
            }`}
            title={isAudioMuted ? 'Unmute microphone (Ctrl+D)' : 'Mute microphone (Ctrl+D)'}
          >
            {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Camera */}
          <button
            onClick={toggleVideo}
            className={`p-3.5 rounded-2xl border transition-all ${
              isVideoOff
                ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-950/40'
                : 'bg-slate-800/90 hover:bg-slate-700 text-slate-100 border-slate-700'
            }`}
            title={isVideoOff ? 'Start camera (Ctrl+E)' : 'Stop camera (Ctrl+E)'}
          >
            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </button>

          {/* Screen Share */}
          <button
            onClick={toggleScreenShare}
            className={`p-3.5 rounded-2xl border transition-all ${
              isScreenSharing
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-400 shadow-lg shadow-indigo-950/50 animate-pulse'
                : 'bg-slate-800/90 hover:bg-slate-700 text-slate-100 border-slate-700'
            }`}
            title={isScreenSharing ? 'Stop sharing screen' : 'Share your screen'}
          >
            <Monitor className="w-5 h-5" />
          </button>

          <div className="h-6 w-px bg-slate-800 mx-1 hidden sm:block" />

          {/* Whiteboard */}
          <button
            onClick={() => setActivePanel(activePanel === 'whiteboard' ? 'none' : 'whiteboard')}
            className={`p-3.5 rounded-2xl border transition-all relative ${
              activePanel === 'whiteboard'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-950'
                : 'bg-slate-800/90 hover:bg-slate-700 text-slate-100 border-slate-700'
            }`}
            title="Toggle Collaborative Whiteboard"
          >
            <Palette className="w-5 h-5" />
          </button>

          {/* Chat */}
          <button
            onClick={() => setActivePanel(activePanel === 'chat' ? 'none' : 'chat')}
            className={`p-3.5 rounded-2xl border transition-all relative ${
              activePanel === 'chat'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-950'
                : 'bg-slate-800/90 hover:bg-slate-700 text-slate-100 border-slate-700'
            }`}
            title="Toggle Meeting Chat"
          >
            <MessageSquare className="w-5 h-5" />
            {unreadChatCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-slate-950">
                {unreadChatCount > 9 ? '9+' : unreadChatCount}
              </span>
            )}
          </button>

          {/* Files */}
          <button
            onClick={() => setActivePanel(activePanel === 'files' ? 'none' : 'files')}
            className={`p-3.5 rounded-2xl border transition-all relative ${
              activePanel === 'files'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-950'
                : 'bg-slate-800/90 hover:bg-slate-700 text-slate-100 border-slate-700'
            }`}
            title="Toggle File Sharing"
          >
            <FileText className="w-5 h-5" />
            {sharedFiles.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 px-1 min-w-4 h-4 rounded-full bg-slate-700 text-slate-200 text-[10px] font-mono flex items-center justify-center border border-slate-900">
                {sharedFiles.length}
              </span>
            )}
          </button>

          {/* Participants */}
          <button
            onClick={() => setActivePanel(activePanel === 'participants' ? 'none' : 'participants')}
            className={`p-3.5 rounded-2xl border transition-all relative ${
              activePanel === 'participants'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-950'
                : 'bg-slate-800/90 hover:bg-slate-700 text-slate-100 border-slate-700'
            }`}
            title="View Participants"
          >
            <Users className="w-5 h-5" />
            <span className="absolute -top-1.5 -right-1.5 px-1 min-w-4 h-4 rounded-full bg-slate-700 text-slate-200 text-[10px] font-mono flex items-center justify-center border border-slate-900">
              {totalParticipants}
            </span>
          </button>

          <div className="h-6 w-px bg-slate-800 mx-1" />

          {/* Leave Meeting Button */}
          <button
            onClick={() => setShowLeaveConfirm(true)}
            className="p-3.5 px-5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-medium border border-rose-500 shadow-lg shadow-rose-950/50 transition-colors flex items-center gap-2 cursor-pointer active:scale-95"
            title="Leave Meeting"
          >
            <PhoneOff className="w-5 h-5" />
            <span className="hidden sm:inline text-xs font-semibold uppercase tracking-wider">Leave</span>
          </button>
        </div>

        {/* Right empty spacer for balance */}
        <div className="hidden md:block w-1/4" />
      </footer>

      {/* In-App Leave Confirmation Modal */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-rose-600/20 text-rose-400 flex items-center justify-center mx-auto mb-4 border border-rose-500/30">
              <PhoneOff className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-1.5">Leave Meeting?</h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Are you sure you want to leave this session? You can rejoin at any time using room code <span className="font-mono text-indigo-400 font-semibold">{roomId}</span>.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
              >
                Stay in call
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLeaveConfirm(false);
                  onLeave();
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-950 transition-colors"
              >
                Leave Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
