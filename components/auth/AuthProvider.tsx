
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User } from '../../types';
import { supabase } from '../../services/supabaseClient';

interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children?: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) throw error;
        
        if (session?.user) {
          fetchProfile(session.user.id, session.user.email!);
        } else {
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error("Auth initialization error:", err);
        // Stop loading even if auth fails so the app renders (likely showing login screen)
        setIsLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email!);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string, email: string) => {
      try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
          
          if (data) {
              setUser({
                  id: data.id,
                  email: data.email,
                  name: data.name,
                  role: data.role,
                  status: data.status as any,
                  avatar: data.avatar_url
              });
          } else {
              // Fallback if profile trigger failed or slow
               setUser({ id: userId, email, name: email.split('@')[0], status: 'Active' });
          }
      } catch (e) {
          console.error("Error fetching profile", e);
      } finally {
          setIsLoading(false);
      }
  };

  const login = async (email: string, pass: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password: pass
      });

      if (error) {
          console.error("Login failed:", error.message);
          return false;
      }
      return true;
    } catch (err) {
      console.error("Login connection error:", err);
      return false;
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
