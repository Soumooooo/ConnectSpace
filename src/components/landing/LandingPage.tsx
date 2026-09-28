import React, { useState } from 'react';
import {
  Video,
  Monitor,
  Palette,
  ShieldCheck,
  FileText,
  Users,
  ArrowRight,
  Sparkles,
  CheckCircle,
  Copy,
  Lock
} from 'lucide-react';
import { User } from '../../context/AuthContext';

interface LandingPageProps {
  user: User | null;
  onStartMeeting: () => void;
  onJoinMeeting: (code: string) => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onOpenDashboard: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  user,
  onStartMeeting,
  onJoinMeeting,
  onOpenAuth,
  onOpenDashboard
}) => {
  const [joinCode, setJoinCode] = useState('');

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode.trim()) {
      onJoinMeeting(joinCode.trim());
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* 3-Zone Top Bar Contract */}
      <header className="h-16 px-6 lg:px-12 border-b border-slate-850 bg-slate-950/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-40">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-900/40">
            <Video className="w-4 h-4" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            ConnectSpace
          </span>
        </div>

        {/* Zone 2: 4 clean text navigation links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#collaboration" className="hover:text-white transition-colors">Collaboration</a>
          <a href="#security" className="hover:text-white transition-colors">Security</a>
          <a href="#architecture" className="hover:text-white transition-colors">Architecture</a>
        </nav>

        {/* Zone 3: 1-2 primary actions */}
        <div className="flex items-center gap-3">
          {user && !user.isGuest ? (
            <button
              onClick={onOpenDashboard}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-xl transition-colors whitespace-nowrap"
            >
              Dashboard
            </button>
          ) : (
            <button
              onClick={() => onOpenAuth('login')}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white transition-colors whitespace-nowrap"
            >
              Sign In
            </button>
          )}

          <button
            onClick={onStartMeeting}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md shadow-indigo-950 transition-colors whitespace-nowrap flex items-center gap-1.5"
          >
            <span>Start Meeting</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-6 lg:px-12 pt-16 pb-20 max-w-7xl mx-auto w-full flex flex-col items-center text-center">
        {/* Anti-slop kicker */}
        <div className="flex items-center gap-2 text-xs text-indigo-400 font-medium mb-4">
          <span>Real-Time WebRTC</span>
          <span aria-hidden="true">·</span>
          <span>Socket.io Signaling</span>
          <span aria-hidden="true">·</span>
          <span>Web Crypto E2EE</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-4xl leading-[1.15] text-balance">
          Real-Time Video Meetings & Frictionless Collaboration
        </h1>

        <p className="mt-5 text-base sm:text-lg text-slate-400 max-w-2xl leading-relaxed">
          High-definition peer-to-peer video conferencing with built-in collaborative whiteboards, screen sharing, encrypted chat, and instant file sharing for teams.
        </p>

        {/* Action Controls */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 w-full max-w-md justify-center">
          <button
            onClick={onStartMeeting}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-xl shadow-indigo-950/60 transition-all flex items-center justify-center gap-2"
          >
            <Video className="w-4 h-4" />
            <span>Start Instant Meeting</span>
          </button>

          <form onSubmit={handleJoinSubmit} className="w-full sm:w-auto flex items-center gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="Enter Room Code"
              className="px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none w-full sm:w-44 font-mono text-center"
            />
            <button
              type="submit"
              disabled={!joinCode.trim()}
              className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-medium text-sm border border-slate-700 transition-colors whitespace-nowrap"
            >
              Join
            </button>
          </form>
        </div>

        {/* Hero Product UI Preview Mockup */}
        <div className="mt-14 w-full max-w-5xl rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl overflow-hidden p-2 sm:p-3">
          <div className="rounded-2xl bg-slate-950 border border-slate-800/80 overflow-hidden flex flex-col">
            {/* Mock Window Top Bar */}
            <div className="h-10 px-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <span className="ml-3 font-semibold text-slate-200">ConnectSpace · Live Sync</span>
              </div>
              <div className="flex items-center gap-3 font-mono text-[11px]">
                <span className="text-emerald-400">● WebRTC Mesh</span>
                <span className="text-slate-500">·</span>
                <span className="text-slate-400">cns-8f2e-k94</span>
              </div>
            </div>

            {/* Mock Stage */}
            <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4 h-[340px] sm:h-[400px]">
              {/* Left Video Area */}
              <div className="md:col-span-8 grid grid-cols-2 gap-3 h-full">
                <div className="relative rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center p-4 overflow-hidden group">
                  <div className="w-14 h-14 rounded-full bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-lg font-bold text-indigo-300">
                    JD
                  </div>
                  <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded bg-slate-950/80 text-[11px] font-medium text-slate-300">
                    Jessica Doe (Host)
                  </div>
                  <div className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-emerald-400" />
                </div>

                <div className="relative rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center p-4 overflow-hidden">
                  <div className="w-14 h-14 rounded-full bg-emerald-600/30 border border-emerald-400/40 flex items-center justify-center text-lg font-bold text-emerald-300">
                    AM
                  </div>
                  <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded bg-slate-950/80 text-[11px] font-medium text-slate-300">
                    Alex Miller
                  </div>
                  <div className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-emerald-400" />
                </div>

                <div className="relative rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center p-4 overflow-hidden">
                  <div className="w-14 h-14 rounded-full bg-amber-600/30 border border-amber-400/40 flex items-center justify-center text-lg font-bold text-amber-300">
                    SK
                  </div>
                  <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded bg-slate-950/80 text-[11px] font-medium text-slate-300">
                    Sarah Kim
                  </div>
                </div>

                <div className="relative rounded-xl bg-indigo-950/20 border border-indigo-500/30 flex items-center justify-center p-4 overflow-hidden">
                  <div className="text-center">
                    <Monitor className="w-8 h-8 text-indigo-400 mx-auto mb-1 animate-pulse" />
                    <span className="text-[11px] text-indigo-300 font-medium">Screen Sharing Active</span>
                  </div>
                  <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded bg-slate-950/80 text-[11px] font-medium text-slate-300">
                    Main Display
                  </div>
                </div>
              </div>

              {/* Right Panel Mock (Chat & Whiteboard) */}
              <div className="hidden md:flex md:col-span-4 rounded-xl bg-slate-900 border border-slate-800 flex-col p-3 text-left">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs text-slate-400">
                  <span className="font-semibold text-slate-200">Real-Time Chat</span>
                  <span className="text-[10px] text-emerald-400 font-mono">🔒 AES-GCM</span>
                </div>
                <div className="flex-1 py-3 space-y-2.5 text-xs overflow-hidden">
                  <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700/50">
                    <span className="text-[10px] font-semibold text-indigo-400 block">Jessica Doe</span>
                    <span className="text-slate-300">Reviewing the schema updates on screen now!</span>
                  </div>
                  <div className="bg-indigo-600/90 text-white p-2 rounded-lg ml-auto max-w-[85%]">
                    <span>Sounds great, whiteboard sketches are live too.</span>
                  </div>
                  <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700/50">
                    <span className="text-[10px] font-semibold text-emerald-400 block">Alex Miller</span>
                    <span className="text-slate-300">Uploaded latest sprint-spec.pdf to the Files tab.</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
                  <div className="h-7 bg-slate-950 rounded-lg flex-1 border border-slate-800 px-2 text-[11px] text-slate-500 flex items-center">
                    Type a message...
                  </div>
                  <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-xs">
                    ↵
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="py-20 px-6 lg:px-12 border-t border-slate-900 bg-slate-950">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-white tracking-tight">
              Everything Needed for Modern Collaboration
            </h2>
            <p className="mt-3 text-slate-400 text-sm">
              Integrated real-time tools so teams can brainstorm, code, and review without bouncing between disjointed tabs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4">
                <Video className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Peer-to-Peer WebRTC Video</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Direct mesh media streaming with intelligent track negotiation, camera toggles, audio level detection, and automatic recovery.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4">
                <Palette className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Collaborative Whiteboard</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                HTML5 Canvas with synchronized strokes over Socket.io. Pen, highlighter, shapes, eraser, undo, and image export.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all">
              <div className="w-10 h-10 rounded-xl bg-sky-600/20 border border-sky-500/30 flex items-center justify-center text-sky-400 mb-4">
                <Monitor className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Screen Sharing</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Native display media capture for sharing applications, browser tabs, or full monitors with seamless webcam swap.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all">
              <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Web Crypto Client-Side E2EE</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                AES-GCM 256-bit encryption for chat and sensitive notes derived via PBKDF2 directly in the browser runtime.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all">
              <div className="w-10 h-10 rounded-xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white">In-Meeting File Sharing</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Upload slides, documents, and archives directly into the meeting room with live notifications and one-click downloads.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all">
              <div className="w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Presence & Mic Status</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Real-time participant presence, active speaker highlighting, and instant synchronization of mute and video states.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture Section */}
      <section id="architecture" className="py-20 px-6 lg:px-12 border-t border-slate-900 bg-slate-900/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Engineered for Modern Web Standards
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            A cohesive full-stack architecture built from first principles.
          </p>

          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-500 uppercase tracking-wider block font-mono">Signaling</span>
              <span className="text-sm font-semibold text-slate-200 mt-1 block">Socket.io</span>
              <span className="text-xs text-slate-400 mt-0.5 block">Sub-10ms events</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-500 uppercase tracking-wider block font-mono">Media</span>
              <span className="text-sm font-semibold text-slate-200 mt-1 block">WebRTC Mesh</span>
              <span className="text-xs text-slate-400 mt-0.5 block">STUN / SRTP audio & video</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-500 uppercase tracking-wider block font-mono">Auth & Security</span>
              <span className="text-sm font-semibold text-slate-200 mt-1 block">JWT + Web Crypto</span>
              <span className="text-xs text-slate-400 mt-0.5 block">AES-GCM client encryption</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-500 uppercase tracking-wider block font-mono">Database</span>
              <span className="text-sm font-semibold text-slate-200 mt-1 block">SQLite Engine</span>
              <span className="text-xs text-slate-400 mt-0.5 block">Zero-config persistence</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-8 px-6 lg:px-12 border-t border-slate-900 bg-slate-950 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-300">ConnectSpace</span>
          <span>·</span>
          <span>Real-Time Conferencing & Collaboration</span>
        </div>
        <div className="flex items-center gap-6">
          <button onClick={() => onOpenAuth('login')} className="hover:text-slate-300 transition-colors">
            Account
          </button>
          <button onClick={onStartMeeting} className="hover:text-slate-300 transition-colors">
            Start Meeting
          </button>
        </div>
      </footer>
    </div>
  );
};
