import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UserAccount, MembershipTier } from '../types';

interface AuthContextType {
  currentUser: UserAccount | null;
  isLoggedIn: boolean;
  isPlus: boolean;
  login: (email: string, password: string) => { success: boolean; message?: string };
  register: (name: string, email: string, password: string) => { success: boolean; message?: string };
  logout: () => void;
  upgradePlus: (tier: MembershipTier, plusExpiresAt?: string) => void;
  updateProfile: (name: string, email: string) => { success: boolean; message?: string };
}

const USERS_DB_KEY = 'deung_sati_users_db_v1';
const ACTIVE_SESSION_KEY = 'deung_sati_active_user_session';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface StoredUserRecord extends UserAccount {
  passwordHash: string;
}

// Simple deterministic hash for demo/client-side storage
const hashPassword = (pwd: string): string => {
  let hash = 0;
  for (let i = 0; i < pwd.length; i++) {
    const char = pwd.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `hash_${Math.abs(hash)}_${pwd.length}`;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usersDb, setUsersDb] = useState<Record<string, StoredUserRecord>>(() => {
    try {
      const saved = localStorage.getItem(USERS_DB_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load users DB', e);
    }
    // Default seed account for testing / founder
    const seedId = 'user-founder-1';
    return {
      'nutty@deungsati.app': {
        id: seedId,
        name: 'Nutty NTYGOGO',
        email: 'nutty@deungsati.app',
        passwordHash: hashPassword('123456'),
        isPlus: true,
        tier: 'lifetime',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      },
    };
  });

  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(ACTIVE_SESSION_KEY) || null;
    } catch {
      return null;
    }
  });

  // Save DB changes
  useEffect(() => {
    try {
      localStorage.setItem(USERS_DB_KEY, JSON.stringify(usersDb));
    } catch (e) {
      console.warn('Failed to persist users DB', e);
    }
  }, [usersDb]);

  // Save session changes
  useEffect(() => {
    try {
      if (currentUserId) {
        localStorage.setItem(ACTIVE_SESSION_KEY, currentUserId);
      } else {
        localStorage.removeItem(ACTIVE_SESSION_KEY);
      }
    } catch (e) {
      console.warn('Failed to persist active session', e);
    }
  }, [currentUserId]);

  // Find active user from DB
  const currentUserRecord = currentUserId
    ? Object.values(usersDb).find((u) => u.id === currentUserId || u.email.toLowerCase() === currentUserId.toLowerCase())
    : null;

  const currentUser: UserAccount | null = currentUserRecord
    ? {
        id: currentUserRecord.id,
        name: currentUserRecord.name,
        email: currentUserRecord.email,
        isPlus: currentUserRecord.isPlus,
        tier: currentUserRecord.tier,
        plusExpiresAt: currentUserRecord.plusExpiresAt,
        createdAt: currentUserRecord.createdAt,
        lastLoginAt: currentUserRecord.lastLoginAt,
        avatarUrl: currentUserRecord.avatarUrl,
      }
    : null;

  // Fallback check if anonymous user had Plus stored locally
  const isPlus = currentUser ? currentUser.isPlus : (() => {
    try {
      return localStorage.getItem('deung_sati_is_plus_user') === 'true';
    } catch {
      return false;
    }
  })();

  const login = (email: string, password: string): { success: boolean; message?: string } => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      return { success: false, message: 'กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน' };
    }

    const user = usersDb[cleanEmail];
    if (!user) {
      return { success: false, message: 'ไม่พบบัญชีอีเมลนี้ในระบบ กรุณาสมัครสมาชิกก่อนเข้าใช้งาน' };
    }

    const hashedInput = hashPassword(password);
    if (user.passwordHash !== hashedInput) {
      return { success: false, message: 'รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง' };
    }

    // Update last login
    const updatedUser = {
      ...user,
      lastLoginAt: new Date().toISOString(),
    };

    setUsersDb((prev) => ({
      ...prev,
      [cleanEmail]: updatedUser,
    }));

    setCurrentUserId(updatedUser.id);
    return { success: true };
  };

  const register = (name: string, email: string, password: string): { success: boolean; message?: string } => {
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      return { success: false, message: 'กรุณากรอกชื่อของคุณ' };
    }
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      return { success: false, message: 'กรุณากรอกรูปแบบอีเมลให้ถูกต้อง' };
    }
    if (!password || password.length < 6) {
      return { success: false, message: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร' };
    }

    if (usersDb[cleanEmail]) {
      return { success: false, message: 'อีเมลนี้ถูกลงทะเบียนไว้แล้ว กรุณาเข้าสู่ระบบ' };
    }

    // Check if guest currently has plus status to migrate
    const previousPlus = localStorage.getItem('deung_sati_is_plus_user') === 'true';

    const newId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newUser: StoredUserRecord = {
      id: newId,
      name: cleanName,
      email: cleanEmail,
      passwordHash: hashPassword(password),
      isPlus: previousPlus,
      tier: previousPlus ? 'monthly' : 'free',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    setUsersDb((prev) => ({
      ...prev,
      [cleanEmail]: newUser,
    }));

    setCurrentUserId(newId);
    return { success: true };
  };

  const logout = () => {
    setCurrentUserId(null);
  };

  const upgradePlus = (tier: MembershipTier, plusExpiresAt?: string) => {
    if (currentUser) {
      const email = currentUser.email.toLowerCase();
      const updatedUser: StoredUserRecord = {
        ...usersDb[email],
        isPlus: true,
        tier,
        plusExpiresAt: plusExpiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      };

      setUsersDb((prev) => ({
        ...prev,
        [email]: updatedUser,
      }));
    }

    // Also persist to general storage flag for offline continuity
    try {
      localStorage.setItem('deung_sati_is_plus_user', 'true');
    } catch (e) {
      console.warn(e);
    }
  };

  const updateProfile = (name: string, email: string): { success: boolean; message?: string } => {
    if (!currentUser) return { success: false, message: 'กรุณาเข้าสู่ระบบก่อน' };
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || !cleanEmail) {
      return { success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' };
    }

    const oldEmail = currentUser.email.toLowerCase();
    const existing = usersDb[oldEmail];

    if (!existing) return { success: false, message: 'ไม่พบบัญชีผู้ใช้' };

    const updated = {
      ...existing,
      name: cleanName,
      email: cleanEmail,
    };

    const newDb = { ...usersDb };
    if (oldEmail !== cleanEmail) {
      delete newDb[oldEmail];
    }
    newDb[cleanEmail] = updated;

    setUsersDb(newDb);
    return { success: true };
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLoggedIn: !!currentUser,
        isPlus,
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
