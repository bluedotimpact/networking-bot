import { useEffect, useState } from 'react';
import { now } from '../timestamp';

// TODO: handle automatically logging out when the token expires?

export interface AuthState {
  token: string,
  expiresAt: number,
}

const LOCAL_STORAGE_AUTH_KEY = 'bluedot_auth';
const getAuthFromLocalStorage = (): AuthState | undefined => {
  const value = typeof localStorage === 'undefined' ? null : localStorage.getItem(LOCAL_STORAGE_AUTH_KEY);
  if (value !== null) {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed.token !== 'string') return undefined;
      if (typeof parsed.expiresAt !== 'number') return undefined;
      if (parsed.expiresAt < now()) return undefined;
      return {
        token: parsed.token,
        expiresAt: parsed.expiresAt,
      };
    } catch {
      // invalid JSON
    }
  }
  return undefined;
};

let authState: AuthState | undefined = getAuthFromLocalStorage();
const authStateListeners = new Set<() => void>();
const setAuthState = (newState?: AuthState) => {
  authState = newState;
  try {
    if (newState) {
      localStorage.setItem(LOCAL_STORAGE_AUTH_KEY, JSON.stringify(newState));
    } else {
      localStorage.removeItem(LOCAL_STORAGE_AUTH_KEY);
    }
  } catch {
    // no-op
  }
  authStateListeners.forEach((l) => l());
};

export const useAuthState = () => {
  const [state, setState] = useState(authState);
  useEffect(() => {
    const listener = () => {
      setState(authState);
    };
    authStateListeners.add(listener);
    listener();
    return () => { authStateListeners.delete(listener); };
  }, []);
  return [state, setAuthState] as const;
};
