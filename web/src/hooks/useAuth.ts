'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  fetchAuthSession,
  getCurrentUser,
  signIn,
  signOut,
  type AuthUser,
} from 'aws-amplify/auth';
import '@/lib/amplify-config';

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const checkUser = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      return currentUser;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      try {
        const currentUser = await getCurrentUser();
        if (mounted) {
          setUser(currentUser);
        }
      } catch {
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadUser();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleSignIn(email: string, password: string) {
    const result = await signIn({ username: email, password });
    if (result.isSignedIn) {
      await checkUser();
    }
    return result;
  }

  async function handleSignOut() {
    await signOut();
    setUser(null);
  }

  async function getAccessToken() {
    const session = await fetchAuthSession();
    return session.tokens?.accessToken?.toString();
  }

  return {
    user,
    loading,
    checkUser,
    signIn: handleSignIn,
    signOut: handleSignOut,
    getAccessToken,
  };
}
