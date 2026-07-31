import { API_URL } from '../config';
import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import axios from 'axios';

export interface User {
  id: string;
  username: string;
  role: 'ADMIN' | 'TRADER';
  teamName: string;
  cash: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
  updateCash: (newCash: number) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = `${API_URL}`;

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('mm_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('mm_token');
      if (storedToken) {
        try {
          axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          const res = await axios.get(`${API_BASE_URL}/auth/me`);
          setUser(res.data);
          setToken(storedToken);
        } catch (error) {
          console.error('Failed to verify stored token:', error);
          localStorage.removeItem('mm_token');
          delete axios.defaults.headers.common['Authorization'];
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = (newToken: string, userData: User) => {
    localStorage.setItem('mm_token', newToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('mm_token');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  };

  const updateCash = (newCash: number) => {
    if (user) {
      setUser({ ...user, cash: newCash });
    }
  };

  const refreshUser = async () => {
    if (token) {
      try {
        const res = await axios.get(`${API_BASE_URL}/auth/me`);
        setUser(res.data);
      } catch (err) {
        console.error('Error refreshing user:', err);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, updateCash, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
