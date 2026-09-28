import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LandingPage } from './components/landing/LandingPage';
import { Dashboard } from './components/dashboard/Dashboard';
import { MeetingLobby } from './components/meeting/MeetingLobby';
import { MeetingRoom } from './components/meeting/MeetingRoom';
import { AuthModal } from './components/auth/AuthModal';
import { CreateMeetingModal } from './components/modals/CreateMeetingModal';

function MainApp() {
  const { user, setGuestUser, isLoading } = useAuth();

  const [currentView, setCurrentView] = useState<'landing' | 'dashboard' | 'lobby' | 'meeting'>('landing');
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [activeRoomTitle, setActiveRoomTitle] = useState('ConnectSpace Meeting');
  const [activeRoomPasskey, setActiveRoomPasskey] = useState('');
  const [hasPassphrase, setHasPassphrase] = useState(false);
  const [joinSettings, setJoinSettings] = useState<{
    name: string;
    audioEnabled: boolean;
    videoEnabled: boolean;
    passphrase?: string;
  }>({
    name: '',
    audioEnabled: true,
    videoEnabled: true
  });

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Check URL hash for direct meeting room links (e.g. #room=cns-xxxx-yyyy&key=secret)
  useEffect(() => {
    const handleHashChange = async () => {
      const hash = window.location.hash;
      if (hash.startsWith('#room=')) {
        const queryPart = hash.slice(6);
        const params = new URLSearchParams(queryPart);
        const roomId = params.get('room') || queryPart.split('&')[0];
        const key = params.get('key') || '';

        if (roomId) {
          setActiveRoomId(roomId);
          if (key) setActiveRoomPasskey(key);

          // Fetch room details
          try {
            const res = await fetch(`/api/rooms/${roomId}`);
            if (res.ok) {
              const data = await res.json();
              setActiveRoomTitle(data.room.title || 'ConnectSpace Meeting');
              setHasPassphrase(data.room.hasPassphrase || Boolean(key));
            }
          } catch (e) {
            console.warn('Room fetch error:', e);
          }

          setCurrentView('lobby');
        }
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleStartInstantMeeting = async () => {
    try {
      const token = localStorage.getItem('connectspace_token');
      const res = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          title: `${user?.name || 'Quick'} Space`,
          hostName: user?.name || 'Host'
        })
      });

      const data = await res.json();
      if (res.ok && data.room) {
        setActiveRoomId(data.room.id);
        setActiveRoomTitle(data.room.title);
        setHasPassphrase(false);
        setActiveRoomPasskey('');
        window.location.hash = `#room=${data.room.id}`;
        setCurrentView('lobby');
      }
    } catch (err) {
      console.error('Instant meeting error:', err);
    }
  };

  const handleCreateCustomRoom = async (roomData: { title: string; passphrase?: string }) => {
    try {
      const token = localStorage.getItem('connectspace_token');
      const res = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          title: roomData.title,
          passphrase: roomData.passphrase,
          hostName: user?.name || 'Host'
        })
      });

      const data = await res.json();
      if (res.ok && data.room) {
        setIsCreateModalOpen(false);
        setActiveRoomId(data.room.id);
        setActiveRoomTitle(data.room.title);
        setHasPassphrase(Boolean(roomData.passphrase));
        setActiveRoomPasskey(roomData.passphrase || '');

        const keyParam = roomData.passphrase ? `&key=${encodeURIComponent(roomData.passphrase)}` : '';
        window.location.hash = `#room=${data.room.id}${keyParam}`;
        setCurrentView('lobby');
      }
    } catch (err) {
      console.error('Custom room error:', err);
    }
  };

  const handleJoinMeetingCode = async (rawCode: string) => {
    let cleanCode = rawCode.trim();
    let directKey = '';

    // Handle full URLs pasted
    if (cleanCode.includes('#room=')) {
      const hashPart = cleanCode.split('#room=')[1];
      const parts = hashPart.split('&key=');
      cleanCode = parts[0];
      if (parts[1]) directKey = decodeURIComponent(parts[1]);
    }

    try {
      const res = await fetch(`/api/rooms/${cleanCode}`);
      if (res.ok) {
        const data = await res.json();
        setActiveRoomId(data.room.id);
        setActiveRoomTitle(data.room.title || 'Meeting');
        setHasPassphrase(data.room.hasPassphrase);
        if (directKey) setActiveRoomPasskey(directKey);

        const keyParam = directKey ? `&key=${encodeURIComponent(directKey)}` : '';
        window.location.hash = `#room=${cleanCode}${keyParam}`;
        setCurrentView('lobby');
      } else {
        // Allow joining directly anyway
        setActiveRoomId(cleanCode);
        setActiveRoomTitle(`Meeting ${cleanCode}`);
        setHasPassphrase(false);
        window.location.hash = `#room=${cleanCode}`;
        setCurrentView('lobby');
      }
    } catch (err) {
      setActiveRoomId(cleanCode);
      setActiveRoomTitle(`Meeting ${cleanCode}`);
      window.location.hash = `#room=${cleanCode}`;
      setCurrentView('lobby');
    }
  };

  const handleLobbyJoin = (settings: {
    name: string;
    audioEnabled: boolean;
    videoEnabled: boolean;
    passphrase?: string;
  }) => {
    if (!user || user.isGuest) {
      setGuestUser(settings.name);
    }
    setJoinSettings(settings);
    if (settings.passphrase) {
      setActiveRoomPasskey(settings.passphrase);
    }
    setCurrentView('meeting');
  };

  const handleLeaveMeeting = () => {
    try {
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname);
      } else {
        window.location.hash = '';
      }
    } catch {
      window.location.hash = '';
    }
    setActiveRoomId(null);
    setActiveRoomPasskey('');
    if (user && !user.isGuest) {
      setCurrentView('dashboard');
    } else {
      setCurrentView('landing');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-mono text-sm">
        Initializing ConnectSpace...
      </div>
    );
  }

  // Active in call
  if (currentView === 'meeting' && activeRoomId) {
    const activeUser: import('./context/AuthContext').User = user || {
      id: `guest_${Date.now()}`,
      name: joinSettings.name || 'Participant',
      email: '',
      isGuest: true
    };
    return (
      <MeetingRoom
        roomId={activeRoomId}
        roomTitle={activeRoomTitle}
        user={activeUser}
        initialAudio={joinSettings.audioEnabled}
        initialVideo={joinSettings.videoEnabled}
        roomPasskey={activeRoomPasskey || joinSettings.passphrase}
        onLeave={handleLeaveMeeting}
      />
    );
  }

  // Pre-meeting lobby
  if (currentView === 'lobby' && activeRoomId) {
    const defaultUser = user || { id: '', name: 'Guest', email: '' };
    return (
      <MeetingLobby
        roomId={activeRoomId}
        roomTitle={activeRoomTitle}
        user={defaultUser}
        hasPassphrase={hasPassphrase}
        onJoin={handleLobbyJoin}
        onCancel={() => {
          window.location.hash = '';
          setActiveRoomId(null);
          setCurrentView(user && !user.isGuest ? 'dashboard' : 'landing');
        }}
      />
    );
  }

  // User Dashboard
  if (currentView === 'dashboard' && user && !user.isGuest) {
    return (
      <>
        <Dashboard
          user={user}
          onStartMeeting={handleStartInstantMeeting}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
          onJoinMeeting={handleJoinMeetingCode}
          onGoHome={() => setCurrentView('landing')}
        />
        <CreateMeetingModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={handleCreateCustomRoom}
        />
      </>
    );
  }

  // Landing Page
  return (
    <>
      <LandingPage
        user={user}
        onStartMeeting={handleStartInstantMeeting}
        onJoinMeeting={handleJoinMeetingCode}
        onOpenAuth={(mode) => {
          setAuthMode(mode);
          setIsAuthOpen(true);
        }}
        onOpenDashboard={() => setCurrentView('dashboard')}
      />

      <AuthModal
        isOpen={isAuthOpen}
        defaultMode={authMode}
        onClose={() => setIsAuthOpen(false)}
      />

      <CreateMeetingModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateCustomRoom}
      />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
