'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { UserProfile } from '@/types/auth';
import { AppStorageEngine } from '@/lib/storage/app-db';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  activeUsername: string;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  activeUsername: '',
  login: async () => ({ success: false }),
  signUp: async () => ({ success: false }),
  signOut: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const formatEmail = (username: string) => {
    const clean = username.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
    return `${clean}@steepquant.com`;
  };

  const fetchProfile = async (userId: string, defaultUsername: string) => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (data) {
        setUser(data as UserProfile);
      } else {
        setUser({
          id: userId,
          username: defaultUsername,
          created_at: new Date().toISOString(),
        });
      }
    } catch {
      setUser({
        id: userId,
        username: defaultUsername,
        created_at: new Date().toISOString(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const username = session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'trader';
        fetchProfile(session.user.id, username);
      } else {
        // Check stored local session for offline mode
        const storedUser = typeof window !== 'undefined' ? localStorage.getItem('steep_quant_user_session') : null;
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch {
            setUser(null);
          }
        } else {
          setUser(null);
        }
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const username = session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'trader';
        fetchProfile(session.user.id, username);
      } else {
        const storedUser = typeof window !== 'undefined' ? localStorage.getItem('steep_quant_user_session') : null;
        if (!storedUser) {
          setUser(null);
        }
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (username: string, password: string) => {
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');

    try {
      // 1. Try server-side Supabase Auth Login
      const res = await fetch('/api/db/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUsername, password }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.user) {
        setUser(data.user);
        if (typeof window !== 'undefined') {
          localStorage.setItem('steep_quant_user_session', JSON.stringify(data.user));
        }

        // Sign in on browser client too to keep browser SDK in sync
        try {
          const supabase = getSupabaseBrowserClient();
          await supabase.auth.signInWithPassword({
            email: formatEmail(cleanUsername),
            password,
          });
        } catch {
          // Ignore if browser SDK session sync has issues
        }

        // Sync any local unsynced analyses to Supabase
        AppStorageEngine.syncListToSupabase(AppStorageEngine.getAnalyses()).catch(() => {});

        return { success: true };
      }

      // 2. Local Fallback
      const storedUsersStr = typeof window !== 'undefined' ? localStorage.getItem('steep_quant_registered_users') : null;
      const storedUsers = storedUsersStr ? JSON.parse(storedUsersStr) : {};
      if (storedUsers[cleanUsername] && storedUsers[cleanUsername].password === password) {
        const profile: UserProfile = {
          id: storedUsers[cleanUsername].id,
          username: cleanUsername,
          created_at: new Date().toISOString(),
        };
        setUser(profile);
        if (typeof window !== 'undefined') {
          localStorage.setItem('steep_quant_user_session', JSON.stringify(profile));
        }
        return { success: true };
      }

      return {
        success: false,
        error: data.error || 'Invalid username or password. Please check your credentials or register.',
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Server connection error.',
      };
    }
  };

  const signUp = async (username: string, password: string) => {
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');

    try {
      // 1. Try server-side Supabase Registration
      const res = await fetch('/api/db/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUsername, password }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.user) {
        setUser(data.user);
        if (typeof window !== 'undefined') {
          localStorage.setItem('steep_quant_user_session', JSON.stringify(data.user));
          
          const storedUsersStr = localStorage.getItem('steep_quant_registered_users');
          const storedUsers = storedUsersStr ? JSON.parse(storedUsersStr) : {};
          storedUsers[cleanUsername] = {
            id: data.user.id,
            password,
          };
          localStorage.setItem('steep_quant_registered_users', JSON.stringify(storedUsers));
        }

        // Sign in on browser client too
        try {
          const supabase = getSupabaseBrowserClient();
          await supabase.auth.signInWithPassword({
            email: formatEmail(cleanUsername),
            password,
          });
        } catch {
          // Ignore
        }

        // Sync any local unsynced analyses to Supabase
        AppStorageEngine.syncListToSupabase(AppStorageEngine.getAnalyses()).catch(() => {});

        return { success: true };
      }

      return {
        success: false,
        error: data.error || 'Registration failed. Please try a different username.',
      };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Registration failed.' };
    }
  };

  const signOut = async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
    } catch {}
    if (typeof window !== 'undefined') {
      localStorage.removeItem('steep_quant_user_session');
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        activeUsername: user?.username || '',
        login,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
