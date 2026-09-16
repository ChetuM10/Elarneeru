'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { API_BASE_URL } from '../lib/api';
import Cookies from 'js-cookie';

interface AppUser {
  id: string;
  phone: string;
  name?: string | null;
  email?: string | null;
  role: string;
}

interface AuthContextType {
  user: User | null;
  dbUser: AppUser | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  dbUser: null,
  loading: true,
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        
        // When auth state changes to logged in, sync with backend
        try {
          const idToken = await firebaseUser.getIdToken(true);
          const response = await fetch(`${API_BASE_URL}/api/v1/auth/verify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({ idToken })
          });
          
          if (response.ok) {
            const data = await response.json();
            // Store the JWT issued by our backend in a cookie
            Cookies.set('token', data.token, { expires: 7 }); // expires in 7 days
            setDbUser(data.user);
          } else {
            console.error('Backend authentication failed');
            Cookies.remove('token');
            await auth.signOut();
            setUser(null);
            setDbUser(null);
          }
        } catch (error) {
          console.error('Error syncing auth state with backend', error);
          Cookies.remove('token');
          setDbUser(null);
        }
      } else {
        setUser(null);
        setDbUser(null);
        Cookies.remove('token');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await auth.signOut();
    Cookies.remove('token');
    setUser(null);
    setDbUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, dbUser, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
