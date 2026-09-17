import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { UserAccount, MembershipTier } from '../types';

interface AuthContextType {
  currentUser: UserAccount | null;
  isLoggedIn: boolean;
  isPlus: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  upgradePlus: (tier: MembershipTier, plusExpiresAt?: string) => void;
  updateProfile: (name: string, email: string) => Promise<{ success: boolean; message?: string }>;
}

const AUTH_TOKEN_KEY = 'deung_sati_session_token';
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const getStoredToken = (): string | null => {
    try {
      return localStorage.getItem(AUTH_TOKEN_KEY);
    } catch {
      return null;
    }
  };

  const setStoredToken = (token: string | null) => {
    try {
      if (token) {
        localStorage.setItem(AUTH_TOKEN_KEY, token);
      } else {
        localStorage.removeItem(AUTH_TOKEN_KEY);
      }
    } catch (e) {
      console.warn('Failed to store session token', e);
    }
  };

  // Restore session from server on mount
  const restoreSession = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = getStoredToken();
      const headers: Record<string, string> = {
        'X-DeungSati-Client': 'true',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/auth/me', {
        method: 'GET',
        headers,
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentUser({
          id: data.id,
          name: data.name,
          email: data.email,
          tier: data.tier || 'free',
          isPlus: data.tier === 'lifetime' || data.tier === 'monthly',
          createdAt: data.createdAt,
        });
      } else {
        // Expired or invalid session
        setCurrentUser(null);
        setStoredToken(null);
      }
    } catch (err: any) {
      console.warn('Session restore network check failed:', err);
      setCurrentUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      return { success: false, message: 'กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน' };
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-DeungSati-Client': 'true',
        },
        credentials: 'include',
        body: JSON.stringify({ email: cleanEmail, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.error || 'เข้าสู่ระบบไม่สำเร็จ' };
      }

      if (data.token) {
        setStoredToken(data.token);
      }

      setCurrentUser({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        tier: data.user.tier || 'free',
        isPlus: data.user.tier === 'lifetime' || data.user.tier === 'monthly',
        createdAt: data.user.createdAt || new Date().toISOString(),
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์' };
    }
  };

  const register = async (name: string, email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      return { success: false, message: 'กรุณากรอกชื่อของคุณ' };
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, message: 'กรุณากรอกรูปแบบอีเมลให้ถูกต้อง' };
    }
    if (!password || password.length < 6) {
      return { success: false, message: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร' };
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-DeungSati-Client': 'true',
        },
        credentials: 'include',
        body: JSON.stringify({ name: cleanName, email: cleanEmail, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.error || 'ลงทะเบียนไม่สำเร็จ' };
      }

      if (data.token) {
        setStoredToken(data.token);
      }

      setCurrentUser({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        tier: data.user.tier || 'free',
        isPlus: false,
        createdAt: data.user.createdAt || new Date().toISOString(),
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์' };
    }
  };

  const logout = async () => {
    try {
      const token = getStoredToken();
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-DeungSati-Client': 'true',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
      });
    } catch {
      // Ignore network errors on logout
    } finally {
      setCurrentUser(null);
      setStoredToken(null);
    }
  };

  const upgradePlus = (tier: MembershipTier) => {
    if (currentUser) {
      setCurrentUser((prev) => (prev ? { ...prev, isPlus: true, tier } : null));
    }
  };

  const updateProfile = async (name: string, email: string): Promise<{ success: boolean; message?: string }> => {
    if (!currentUser) return { success: false, message: 'กรุณาเข้าสู่ระบบก่อน' };
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || !cleanEmail) {
      return { success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' };
    }

    // Update local state and mock sync
    setCurrentUser((prev) => (prev ? { ...prev, name: cleanName, email: cleanEmail } : null));
    return { success: true };
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLoggedIn: !!currentUser,
        isPlus: !!currentUser?.isPlus,
        isLoading,
        error,
        login,
        register,
        logout,
        upgradePlus,
        updateProfile,
      }}
    >
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
