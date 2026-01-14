import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { login, register, signupInit, signupVerify, passwordResetInit, passwordResetVerify, passwordResetVerifyOtpOnly, passwordResetComplete } from '../api/auth';
import type { LoginData, RegisterData, AuthResponse, SignupInitPayload, SignupVerifyPayload, PasswordResetInitPayload, PasswordResetVerifyPayload, PasswordResetOtpOnlyPayload, PasswordResetCompletePayload } from '../api/auth';

// Admin emails configuration
const ADMIN_EMAILS = [
  'ruhankb29@gmail.com',
  'prasanthsri542@gmail.com',
  'sunshine.sankum@gmail.com',
  'suganthr09@gmail.com',
  'mkavin1106@gmail.com',
  'ssanthoshcse44@gmail.com',
  'nithi4527@gmail.com',
  'dnaveenprabu2007@gmail.com',
  'nithishkumar1642006@gmail.com',
  'sanjithsvpm@gmail.com'
];

interface User {
  id: number;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  isAuthenticating: boolean;
  challengeToken: string | null;
  login: (data: LoginData) => Promise<boolean>;
  register: (data: RegisterData) => Promise<boolean>;
  startSignup: (data: SignupInitPayload) => Promise<{ challengeToken: string }>;
  verifySignup: (data: SignupVerifyPayload) => Promise<boolean>;
  startPasswordReset: (data: PasswordResetInitPayload) => Promise<{ challengeToken: string }>;
  verifyPasswordReset: (data: PasswordResetVerifyPayload) => Promise<AuthResponse>;
  verifyPasswordResetOtpOnly: (data: PasswordResetOtpOnlyPayload) => Promise<{ verifiedChallengeToken: string; email: string }>;
  completePasswordReset: (data: PasswordResetCompletePayload) => Promise<AuthResponse>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [challengeToken, setChallengeToken] = useState<string | null>(null);

  // Check if current user is admin
  const isAdmin = user ? ADMIN_EMAILS.includes(user.email) : false;

  // Check for existing token on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }

    setIsLoading(false);
  }, []);

  // Listen for storage changes (token removal from API interceptor)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token' && !e.newValue) {
        // Token was removed - clear auth state
        setToken(null);
        setUser(null);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleLogin = async (data: LoginData): Promise<boolean> => {
    setIsAuthenticating(true);
    try {
      const response: AuthResponse = await login(data);

      setToken(response.token);
      setUser(response.user);

      // Clear any existing user-specific caches from previous sessions
      localStorage.removeItem('hierarchy');
      localStorage.removeItem('contentMode');

      // Clear all sessionStorage caches to prevent data leakage between users
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && (key.startsWith('content_cache_') || key.startsWith('topics_cache_') || key.startsWith('subtopics_cache_'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => sessionStorage.removeItem(key));
      } catch (error) {
        console.error('Error clearing caches on login:', error);
      }

      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));

      return true;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleRegister = async (data: RegisterData): Promise<boolean> => {
    try {
      setIsAuthenticating(true);
      const response: AuthResponse = await register(data);

      setToken(response.token);
      setUser(response.user);

      // Clear any existing caches for new user
      localStorage.removeItem('hierarchy');
      localStorage.removeItem('contentMode');

      // Clear all sessionStorage caches
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && (key.startsWith('content_cache_') || key.startsWith('topics_cache_') || key.startsWith('subtopics_cache_'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => sessionStorage.removeItem(key));
      } catch (error) {
        console.error('Error clearing caches on register:', error);
      }

      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));

      return true;
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    } finally {
      setIsAuthenticating(false);
    }
  };

  const startSignup = async (data: SignupInitPayload): Promise<{ challengeToken: string }> => {
    setIsAuthenticating(true);
    try {
      const res = await signupInit(data);
      setChallengeToken(res.challengeToken);
      return { challengeToken: res.challengeToken };
    } finally {
      setIsAuthenticating(false);
    }
  };

  const startPasswordReset = async (data: PasswordResetInitPayload): Promise<{ challengeToken: string }> => {
    setIsAuthenticating(true);
    try {
      const res = await passwordResetInit(data);
      return { challengeToken: res.challengeToken };
    } finally {
      setIsAuthenticating(false);
    }
  };

  const verifySignup = async (data: SignupVerifyPayload): Promise<boolean> => {
    setIsAuthenticating(true);
    try {
      const response: AuthResponse = await signupVerify(data);
      setToken(response.token);
      setUser(response.user);

      localStorage.removeItem('hierarchy');
      localStorage.removeItem('contentMode');
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && (key.startsWith('content_cache_') || key.startsWith('topics_cache_') || key.startsWith('subtopics_cache_'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => sessionStorage.removeItem(key));
      } catch (error) {
        console.error('Error clearing caches on register:', error);
      }

      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      setChallengeToken(null);
      return true;
    } finally {
      setIsAuthenticating(false);
    }
  };

  const verifyPasswordReset = async (data: PasswordResetVerifyPayload): Promise<AuthResponse> => {
    setIsAuthenticating(true);
    try {
      const response: AuthResponse = await passwordResetVerify(data);
      // Auto-authenticate after successful password reset
      setToken(response.token);
      setUser(response.user);

      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      localStorage.removeItem('hierarchy');
      localStorage.removeItem('contentMode');
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && (key.startsWith('content_cache_') || key.startsWith('topics_cache_') || key.startsWith('subtopics_cache_'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => sessionStorage.removeItem(key));
      } catch (error) {
        console.error('Error clearing caches on password reset:', error);
      }

      return response;
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleVerifyPasswordResetOtpOnly = async (data: PasswordResetOtpOnlyPayload): Promise<{ verifiedChallengeToken: string; email: string }> => {
    setIsAuthenticating(true);
    try {
      const response = await passwordResetVerifyOtpOnly(data);
      return { verifiedChallengeToken: response.verifiedChallengeToken, email: response.email };
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleCompletePasswordReset = async (data: PasswordResetCompletePayload): Promise<AuthResponse> => {
    setIsAuthenticating(true);
    try {
      const response: AuthResponse = await passwordResetComplete(data);
      // Auto-authenticate after successful password reset
      setToken(response.token);
      setUser(response.user);

      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      localStorage.removeItem('hierarchy');
      localStorage.removeItem('contentMode');
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && (key.startsWith('content_cache_') || key.startsWith('topics_cache_') || key.startsWith('subtopics_cache_'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => sessionStorage.removeItem(key));
      } catch (error) {
        console.error('Error clearing caches on password reset:', error);
      }

      return response;
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('hierarchy');
    localStorage.removeItem('contentMode');

    // Clear all sessionStorage caches
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.startsWith('content_cache_') || key.startsWith('topics_cache_') || key.startsWith('subtopics_cache_'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => sessionStorage.removeItem(key));
    } catch (error) {
      console.error('Error clearing caches on logout:', error);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isAdmin,
    isLoading,
    isAuthenticating,
    challengeToken,
    login: handleLogin,
    register: handleRegister,
    startSignup,
    verifySignup,
    startPasswordReset,
    verifyPasswordReset,
    verifyPasswordResetOtpOnly: handleVerifyPasswordResetOtpOnly,
    completePasswordReset: handleCompletePasswordReset,
    logout: handleLogout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
