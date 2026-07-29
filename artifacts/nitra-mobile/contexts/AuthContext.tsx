import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createUser, loginUser } from '@workspace/api-client-react';
import type { User } from '@workspace/api-client-react';

const STORAGE_KEY = 'nitra_mobile_user';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, bio?: string, companyName?: string) => Promise<void>;
  updateLocalUser: (patch: Partial<User>) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  updateLocalUser: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored) {
          try {
            setUser(JSON.parse(stored) as User);
          } catch {}
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const saveUser = useCallback(async (u: User) => {
    setUser(u);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(u));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const u = await loginUser({ username, password });
    await saveUser(u);
  }, [saveUser]);

  const register = useCallback(async (
    username: string,
    password: string,
    bio?: string,
    companyName?: string,
  ) => {
    const u = await createUser({ username, password, bio, companyName });
    await saveUser(u);
  }, [saveUser]);

  const updateLocalUser = useCallback((patch: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...patch };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, updateLocalUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
