import React, { useState } from 'react';
import { X, Video, Shield, Key, Loader2, ArrowRight } from 'lucide-react';
import { generateRandomPasskey } from '../../utils/crypto';

interface CreateMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (roomData: { title: string; passphrase?: string }) => Promise<void>;
}

export const CreateMeetingModal: React.FC<CreateMeetingModalProps> = ({
  isOpen,
  onClose,
  onCreate
}) => {
  const [title, setTitle] = useState('');
  const [enableE2EE, setEnableE2EE] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleToggleE2EE = (enabled: boolean) => {
    setEnableE2EE(enabled);
    if (enabled && !passphrase) {
      setPassphrase(generateRandomPasskey());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onCreate({
      title: title.trim() || 'Quick Collaboration Room',
      passphrase: enableE2EE ? passphrase.trim() : undefined
    });
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Create Meeting Room</h2>
            <p className="text-xs text-slate-400">Instant HD video, screen sharing & collaborative whiteboard</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Room Title / Topic
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Design Sync & Architecture Review"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="pt-2">
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="flex items-center gap-2.5">
                <Shield className="w-4 h-4 text-emerald-400" />
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">
                    Web Crypto E2EE Passkey
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    Client-side AES-GCM encryption for chat & data
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={enableE2EE}
                onChange={(e) => handleToggleE2EE(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700 cursor-pointer"
              />
            </div>
          </div>

          {enableE2EE && (
            <div className="animate-fade-in">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                <span>Room Passkey</span>
                <button
                  type="button"
                  onClick={() => setPassphrase(generateRandomPasskey())}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-normal"
                >
                  Generate new
                </button>
              </label>
              <div className="relative">
                <Key className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  required
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-emerald-400 font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Share this passkey with participants so they can decrypt in-meeting messages.
              </p>
            </div>
          )}

          <div className="pt-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-950 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Launch Meeting</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
