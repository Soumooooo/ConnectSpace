import React, { useState, useEffect } from 'react';
import {
  Video,
  Plus,
  ArrowRight,
  LogOut,
  Calendar,
  Copy,
  Check,
  FileText,
  Search,
  ExternalLink,
  Shield,
  Clock,
  Sparkles
} from 'lucide-react';
import { useAuth, User } from '../../context/AuthContext';

export interface RoomRecord {
  id: string;
  title: string;
  host_id: string;
  host_name: string;
  created_at: number;
  is_active: number;
  file_count?: number;
}

interface DashboardProps {
  user: User;
  onStartMeeting: () => void;
  onOpenCreateModal: () => void;
  onJoinMeeting: (code: string) => void;
  onGoHome: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  user,
  onStartMeeting,
  onOpenCreateModal,
  onJoinMeeting,
  onGoHome
}) => {
  const { logout } = useAuth();
  const [rooms, setRooms] = useState<RoomRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchRooms = async () => {
    try {
      const token = localStorage.getItem('connectspace_token');
      const res = await fetch('/api/rooms/user/recent', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setRooms(data.rooms || []);
      }
    } catch (err) {
      console.error('Failed to load user rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [user.id]);

  const handleCopyLink = (roomId: string) => {
    const url = `${window.location.origin}/#room=${roomId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(roomId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCodeInput.trim()) {
      onJoinMeeting(joinCodeInput.trim());
    }
  };

  const filteredRooms = rooms.filter(
    (r) =>
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="h-16 px-6 lg:px-12 border-b border-slate-800/80 bg-slate-950/90 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={onGoHome}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-900/40">
              <Video className="w-4 h-4" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">ConnectSpace</span>
          </button>
          <span className="text-slate-600">/</span>
          <span className="text-xs font-semibold text-slate-400">Dashboard</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-indigo-400">
              {user.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="hidden sm:block text-left">
              <span className="text-xs font-semibold text-slate-200 block truncate max-w-[140px]">
                {user.name}
              </span>
              <span className="text-[11px] text-slate-500 block truncate max-w-[140px]">
                {user.email || 'Guest user'}
              </span>
            </div>
          </div>

          <button
            onClick={logout}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 transition-colors"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10 space-y-8">
        {/* Welcome Banner & Quick Actions */}
        <div className="p-8 rounded-3xl bg-slate-900/80 border border-slate-800 relative overflow-hidden shadow-xl">
          <div className="max-w-2xl">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Hello, {user.name}
            </h1>
            <p className="mt-1 text-sm text-slate-400 leading-relaxed">
              Launch an instant meeting or join an active room code with crystal clear WebRTC video, screen share, and synchronized whiteboard.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={onStartMeeting}
                className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-950 flex items-center gap-2 transition-colors"
              >
                <Video className="w-4 h-4" />
                <span>Instant Meeting</span>
              </button>

              <button
                onClick={onOpenCreateModal}
                className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-semibold text-sm border border-slate-700 flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4 text-indigo-400" />
                <span>Custom Room & E2EE</span>
              </button>
            </div>
          </div>

          {/* Join By Room Code Box */}
          <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Have a room invitation?
            </span>
            <form onSubmit={handleJoinSubmit} className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value)}
                placeholder="Enter room code (e.g. abc-defg-hij)"
                className="px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none font-mono sm:w-64"
              />
              <button
                type="submit"
                disabled={!joinCodeInput.trim()}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-medium text-sm transition-colors whitespace-nowrap"
              >
                Join Room
              </button>
            </form>
          </div>
        </div>

        {/* Recent Meetings Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Your Meeting Rooms</h2>
              <p className="text-xs text-slate-400">Recent rooms hosted or configured under your account</p>
            </div>

            {rooms.length > 0 && (
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by title or code..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            )}
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500">
              Loading rooms...
            </div>
          ) : rooms.length === 0 ? (
            <div className="p-10 rounded-2xl bg-slate-900/40 border border-slate-800/80 text-center text-slate-500 space-y-3">
              <Clock className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-sm font-medium text-slate-300">No meeting rooms yet</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Start an instant meeting or create a scheduled room above to get started.
              </p>
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No rooms matching "{searchQuery}".
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRooms.map((room) => {
                const dateStr = new Date(room.created_at).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                });
                const timeStr = new Date(room.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return (
                  <div
                    key={room.id}
                    className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700/80 transition-all flex flex-col justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-bold text-white truncate" title={room.title}>
                          {room.title}
                        </h3>
                        <span className="text-xs font-mono text-indigo-400 bg-indigo-950/40 px-2 py-0.5 rounded-lg border border-indigo-900/60 shrink-0">
                          {room.id}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-2 font-mono tabular-nums">
                        <span>{dateStr}</span>
                        <span aria-hidden="true">·</span>
                        <span>{timeStr}</span>
                        {typeof room.file_count === 'number' && room.file_count > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-slate-400">{room.file_count} files</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-850">
                      <button
                        onClick={() => handleCopyLink(room.id)}
                        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                        title="Copy room link"
                      >
                        {copiedId === room.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedId === room.id ? 'Copied' : 'Share link'}</span>
                      </button>

                      <button
                        onClick={() => onJoinMeeting(room.id)}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600/90 hover:bg-indigo-600 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <span>Rejoin</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
