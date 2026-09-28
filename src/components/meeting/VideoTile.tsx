import React, { useEffect, useRef } from 'react';
import { MicOff, Pin, PinOff, Monitor } from 'lucide-react';

interface VideoTileProps {
  stream?: MediaStream | null;
  name: string;
  isLocal?: boolean;
  isAudioMuted?: boolean;
  isVideoOff?: boolean;
  isScreenSharing?: boolean;
  isSpeaking?: boolean;
  isPinned?: boolean;
  onTogglePin?: () => void;
  className?: string;
}

export const VideoTile: React.FC<VideoTileProps> = ({
  stream,
  name,
  isLocal = false,
  isAudioMuted = false,
  isVideoOff = false,
  isScreenSharing = false,
  isSpeaking = false,
  isPinned = false,
  onTogglePin,
  className = ''
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (stream) {
      video.srcObject = stream;
      video.play().catch((err) => {
        console.warn(`Video play error for ${name}:`, err);
      });
    } else {
      video.srcObject = null;
    }
  }, [stream, name]);

  const initials = name
    ? name
        .split(' ')
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <div
      className={`relative rounded-2xl overflow-hidden bg-slate-900 border transition-all duration-200 group flex items-center justify-center ${
        isSpeaking
          ? 'border-emerald-500 shadow-[0_0_16px_rgba(16,185,129,0.3)] ring-2 ring-emerald-500/50'
          : 'border-slate-800 hover:border-slate-700'
      } ${className}`}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal} // Always mute local video to prevent audio feedback loop
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isVideoOff ? 'opacity-0 absolute pointer-events-none' : 'opacity-100'
        } ${isLocal && !isScreenSharing ? 'scale-x-[-1]' : ''}`} // Mirror local camera preview unless screen sharing
      />

      {/* Video Off Fallback Avatar */}
      {isVideoOff && (
        <div className="flex flex-col items-center justify-center gap-3 p-6 text-center select-none">
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center font-bold text-2xl transition-transform ${
              isSpeaking
                ? 'bg-emerald-600/30 text-emerald-300 border-2 border-emerald-400 scale-105'
                : 'bg-slate-800 text-slate-200 border border-slate-700'
            }`}
          >
            {initials}
          </div>
          <span className="text-sm font-medium text-slate-300 max-w-[160px] truncate">
            {name}
          </span>
        </div>
      )}

      {/* Top action overlay (Pin button) */}
      {onTogglePin && (
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin();
            }}
            className={`p-2 rounded-xl backdrop-blur-md transition-colors ${
              isPinned
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-950/70 text-slate-300 hover:bg-slate-900 hover:text-white'
            }`}
            title={isPinned ? 'Unpin video' : 'Pin to spotlight'}
          >
            {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}

      {/* Bottom Name & Status Badge */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 max-w-[calc(100%-24px)] z-10">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/75 backdrop-blur-md border border-slate-800/80 text-xs text-slate-200 font-medium truncate shadow-sm">
          {isScreenSharing && (
            <span title="Sharing screen" className="shrink-0 flex items-center">
              <Monitor className="w-3.5 h-3.5 text-indigo-400" />
            </span>
          )}
          <span className="truncate">
            {name} {isLocal && '(You)'}
          </span>
          {isAudioMuted && (
            <span title="Muted" className="shrink-0 ml-0.5 flex items-center">
              <MicOff className="w-3 h-3 text-rose-400" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
