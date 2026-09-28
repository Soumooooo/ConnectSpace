import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  isGuest?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  setGuestUser: (name: string) => User;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('connectspace_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function verifyUser() {
      const storedToken = localStorage.getItem('connectspace_token');
      if (!storedToken) {
        // Check if guest user saved
        const guestName = localStorage.getItem('connectspace_guest_name');
        const guestId = localStorage.getItem('connectspace_guest_id');
        if (guestName && guestId) {
          setUser({ id: guestId, name: guestName, email: '', isGuest: true });
        }
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${storedToken}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          setToken(storedToken);
        } else {
          localStorage.removeItem('connectspace_token');
          setToken(null);
          setUser(null);
        }
      } catch (err) {
        console.error('Session verification error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    verifyUser();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to log in' };
      }
      localStorage.setItem('connectspace_token', data.token);
      setToken(data.token);
      setUser(data.user);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Registration failed' };
      }
      localStorage.setItem('connectspace_token', data.token);
      setToken(data.token);
      setUser(data.user);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const logout = () => {
    localStorage.removeItem('connectspace_token');
    setToken(null);
    setUser(null);
  };

  const setGuestUser = (name: string): User => {
    let guestId = localStorage.getItem('connectspace_guest_id');
    if (!guestId) {
      guestId = `guest_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('connectspace_guest_id', guestId);
    }
    const cleanName = name.trim() || `Guest-${guestId.slice(-4)}`;
    localStorage.setItem('connectspace_guest_name', cleanName);
    const guestObj: User = { id: guestId, name: cleanName, email: '', isGuest: true };
    setUser(guestObj);
    return guestObj;
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, setGuestUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
