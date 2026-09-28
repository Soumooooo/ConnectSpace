import React from 'react';
import { Mic, MicOff, Video, VideoOff, Monitor, Shield, User as UserIcon } from 'lucide-react';
import { RemoteParticipant } from '../../hooks/useWebRTC';
import { User } from '../../context/AuthContext';

interface ParticipantsListProps {
  currentUser: User;
  isLocalAudioMuted: boolean;
  isLocalVideoOff: boolean;
  isLocalScreenSharing: boolean;
  remoteParticipants: Map<string, RemoteParticipant>;
  activeSpeakerSocketId: string | null;
}

export const ParticipantsList: React.FC<ParticipantsListProps> = ({
  currentUser,
  isLocalAudioMuted,
  isLocalVideoOff,
  isLocalScreenSharing,
  remoteParticipants,
  activeSpeakerSocketId
}) => {
  const remotes = Array.from(remoteParticipants.values());
  const totalCount = 1 + remotes.length;

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 overflow-hidden">
      <div className="px-4 py-3 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          In Call ({totalCount})
        </span>
        <span className="text-xs text-emerald-400 font-mono flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {/* Local Participant (You) */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-300 font-semibold text-sm">
              {currentUser.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-100 truncate flex items-center gap-1.5">
                <span>{currentUser.name}</span>
                <span className="text-[11px] text-indigo-400 font-normal">(You)</span>
              </p>
              <p className="text-xs text-slate-500">Local participant</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-slate-400">
            {isLocalScreenSharing && (
              <span className="p-1 rounded bg-indigo-950 text-indigo-400" title="Sharing screen">
                <Monitor className="w-3.5 h-3.5" />
              </span>
            )}
            <span
              className={`p-1.5 rounded-lg ${
                isLocalAudioMuted ? 'bg-rose-950/60 text-rose-400' : 'bg-slate-700 text-slate-300'
              }`}
              title={isLocalAudioMuted ? 'Microphone muted' : 'Microphone active'}
            >
              {isLocalAudioMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </span>
            <span
              className={`p-1.5 rounded-lg ${
                isLocalVideoOff ? 'bg-rose-950/60 text-rose-400' : 'bg-slate-700 text-slate-300'
              }`}
              title={isLocalVideoOff ? 'Camera off' : 'Camera active'}
            >
              {isLocalVideoOff ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
            </span>
          </div>
        </div>

        {/* Remote Participants */}
        {remotes.map((peer) => {
          const isSpeaking = activeSpeakerSocketId === peer.socketId;

          return (
            <div
              key={peer.socketId}
              className={`flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border transition-colors ${
                isSpeaking
                  ? 'border-emerald-500/80 bg-slate-800/80 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                  : 'border-slate-700/40 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                    isSpeaking
                      ? 'bg-emerald-600/30 border-2 border-emerald-400 text-emerald-300'
                      : 'bg-slate-700/60 border border-slate-600 text-slate-300'
                  }`}
                >
                  {peer.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">
                    {peer.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {isSpeaking ? (
                      <span className="text-emerald-400 font-medium">Speaking...</span>
                    ) : (
                      'Participant'
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-slate-400">
                {peer.isScreenSharing && (
                  <span className="p-1 rounded bg-indigo-950 text-indigo-400" title="Sharing screen">
                    <Monitor className="w-3.5 h-3.5" />
                  </span>
                )}
                <span
                  className={`p-1.5 rounded-lg ${
                    peer.isAudioMuted ? 'bg-rose-950/60 text-rose-400' : 'bg-slate-700/70 text-slate-300'
                  }`}
                  title={peer.isAudioMuted ? 'Microphone muted' : 'Microphone active'}
                >
                  {peer.isAudioMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                </span>
                <span
                  className={`p-1.5 rounded-lg ${
                    peer.isVideoOff ? 'bg-rose-950/60 text-rose-400' : 'bg-slate-700/70 text-slate-300'
                  }`}
                  title={peer.isVideoOff ? 'Camera off' : 'Camera active'}
                >
                  {peer.isVideoOff ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
