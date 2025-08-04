import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext({});

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    // Lyt kun til Firebase Auth state
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      if (!mounted) return;
      console.log('Auth state changed, user:', authUser ? 'exists' : 'null');
      if (authUser) {
        const userData = {
          uid: authUser.uid,
          email: authUser.email,
          displayName: authUser.displayName
        };
        setUser(userData);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const logout = async () => {
    try {
      await auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const value = {
    user,
    loading,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
