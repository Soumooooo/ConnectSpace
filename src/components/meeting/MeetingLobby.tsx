import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, Copy, Check, Shield, ArrowRight } from 'lucide-react';
import { User } from '../../context/AuthContext';

interface MeetingLobbyProps {
  roomId: string;
  roomTitle?: string;
  user: User;
  hasPassphrase?: boolean;
  onJoin: (settings: {
    name: string;
    audioEnabled: boolean;
    videoEnabled: boolean;
    passphrase?: string;
  }) => void;
  onCancel: () => void;
}

export const MeetingLobby: React.FC<MeetingLobbyProps> = ({
  roomId,
  roomTitle = 'ConnectSpace Meeting',
  user,
  hasPassphrase = false,
  onJoin,
  onCancel
}) => {
  const [displayName, setDisplayName] = useState(user.name || '');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [passphrase, setPassphrase] = useState('');
  const [copied, setCopied] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Preview local camera and mic
  useEffect(() => {
    let active = true;
    let localStream: MediaStream | null = null;

    async function startPreview() {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        if (active) {
          setStream(localStream);
          if (videoRef.current) {
            videoRef.current.srcObject = localStream;
          }
        }
      } catch (err) {
        console.warn('Lobby camera/mic preview unavailable or denied:', err);
      }
    }

    startPreview();

    return () => {
      active = false;
      if (localStream) {
        localStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Update track enabled states based on user toggles
  useEffect(() => {
    if (stream) {
      stream.getAudioTracks().forEach((t) => {
        t.enabled = audioEnabled;
      });
      stream.getVideoTracks().forEach((t) => {
        t.enabled = videoEnabled;
      });
    }
  }, [audioEnabled, videoEnabled, stream]);

  const handleCopyLink = () => {
    const inviteUrl = `${window.location.origin}/#room=${roomId}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    // Clean up lobby stream before joining actual room
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }

    onJoin({
      name: displayName.trim(),
      audioEnabled,
      videoEnabled,
      passphrase: passphrase.trim()
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Ready to join?
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {roomTitle} · <span className="font-mono text-indigo-400 font-semibold">{roomId}</span>
            </p>
          </div>

          <button
            onClick={handleCopyLink}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-xs font-medium text-slate-200 transition-colors w-fit"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
            <span>{copied ? 'Link Copied!' : 'Copy Room Link'}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
          {/* Video Preview Column */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="relative aspect-video rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center shadow-inner">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover scale-x-[-1] transition-opacity ${
                  videoEnabled ? 'opacity-100' : 'opacity-0'
                }`}
              />

              {!videoEnabled && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 gap-2">
                  <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xl font-bold text-slate-300">
                    {displayName ? displayName.slice(0, 2).toUpperCase() : 'U'}
                  </div>
                  <span className="text-xs text-slate-400 font-medium">Camera is turned off</span>
                </div>
              )}

              {/* Float Controls on Preview */}
              <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setAudioEnabled(!audioEnabled)}
                  className={`p-3 rounded-full backdrop-blur-md border transition-all ${
                    audioEnabled
                      ? 'bg-slate-900/90 text-white border-slate-700 hover:bg-slate-800'
                      : 'bg-rose-600/90 text-white border-rose-500 hover:bg-rose-500 shadow-lg shadow-rose-950/50'
                  }`}
                  title={audioEnabled ? 'Mute microphone' : 'Unmute microphone'}
                >
                  {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </button>

                <button
                  type="button"
                  onClick={() => setVideoEnabled(!videoEnabled)}
                  className={`p-3 rounded-full backdrop-blur-md border transition-all ${
                    videoEnabled
                      ? 'bg-slate-900/90 text-white border-slate-700 hover:bg-slate-800'
                      : 'bg-rose-600/90 text-white border-rose-500 hover:bg-rose-500 shadow-lg shadow-rose-950/50'
                  }`}
                  title={videoEnabled ? 'Turn camera off' : 'Turn camera on'}
                >
                  {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-500 text-center">
              Check your camera and microphone before entering the room.
            </p>
          </div>

          {/* Setup / Join Form Column */}
          <div className="lg:col-span-5 flex flex-col justify-between">
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Your Display Name
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-indigo-500 focus:outline-none placeholder-slate-600"
                />
              </div>

              {hasPassphrase && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Meeting Passkey / E2EE Key</span>
                  </label>
                  <input
                    type="password"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder="Enter room passkey"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-indigo-500 focus:outline-none placeholder-slate-600"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Required for decrypting end-to-end encrypted chat & data.
                  </p>
                </div>
              )}

              <div className="pt-4 flex flex-col gap-2.5">
                <button
                  type="submit"
                  disabled={!displayName.trim()}
                  className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-950 transition-colors"
                >
                  <span>Join Meeting Now</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={onCancel}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
                >
                  Return to Dashboard
                </button>
              </div>
            </form>

            <div className="mt-6 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 flex items-start gap-2.5">
              <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                All video and audio streams are directly peer-to-peer routed via WebRTC with DTLS-SRTP encryption.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
