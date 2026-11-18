import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import {
  AiModelRecord,
  CharacterRecord,
  DbUser,
  GpuNodeRecord,
  ProjectRecord,
  RenderJobRecord,
  SubscriptionRecord,
} from '../types/studio';

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  dbUser: DbUser | null;
  loadingAuth: boolean;
  projects: ProjectRecord[];
  characters: CharacterRecord[];
  renderJobs: RenderJobRecord[];
  subscription: SubscriptionRecord | null;
  aiModels: AiModelRecord[];
  gpuNodes: GpuNodeRecord[];
  cudaWorkerConfigured: boolean;
  cudaWorkerOnline: boolean;
  getToken: () => Promise<string | null>;
  refreshWorkspace: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [characters, setCharacters] = useState<CharacterRecord[]>([]);
  const [renderJobs, setRenderJobs] = useState<RenderJobRecord[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionRecord | null>(null);
  const [aiModels, setAiModels] = useState<AiModelRecord[]>([]);
  const [gpuNodes, setGpuNodes] = useState<GpuNodeRecord[]>([]);
  const [cudaWorkerConfigured, setCudaWorkerConfigured] = useState(false);
  const [cudaWorkerOnline, setCudaWorkerOnline] = useState(false);

  const loadCatalog = useCallback(async () => {
    try {
      const res = await fetch('/api/catalog');
      if (res.ok) {
        const data = await res.json();
        setAiModels(data.aiModels || []);
        setGpuNodes(data.gpuNodes || []);
        setCudaWorkerConfigured(Boolean(data.cudaWorkerConfigured));
        setCudaWorkerOnline(Boolean(data.cudaWorkerOnline));
      }
    } catch (err) {
      console.error('Catalog fetch error:', err);
    }
  }, []);

  const getToken = useCallback(async () => {
    const current = auth.currentUser;
    if (!current) return null;
    return await current.getIdToken();
  }, []);

  const authFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const token = await getToken();
      const headers = new Headers(options.headers);
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
        headers.set('Content-Type', 'application/json');
      }
      return fetch(url, { ...options, headers });
    },
    [getToken]
  );

  const refreshWorkspace = useCallback(async () => {
    const current = auth.currentUser;
    if (!current) {
      setDbUser(null);
      setProjects([]);
      setCharacters([]);
      setRenderJobs([]);
      setSubscription(null);
      await loadCatalog();
      return;
    }

    try {
      const token = await current.getIdToken();
      const res = await fetch('/api/workspace', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDbUser(data.user);
        setProjects(data.projects || []);
        setCharacters(data.characters || []);
        setRenderJobs(data.renderJobs || []);
        setSubscription(data.subscription || null);
        setAiModels(data.aiModels || []);
        setGpuNodes(data.gpuNodes || []);
        setCudaWorkerConfigured(Boolean(data.cudaWorkerConfigured));
      }
    } catch (err) {
      console.error('Workspace sync error:', err);
    }
  }, [loadCatalog]);

  useEffect(() => {
    loadCatalog();
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        await refreshWorkspace();
      } else {
        setDbUser(null);
        setProjects([]);
        setCharacters([]);
        setRenderJobs([]);
        setSubscription(null);
      }
      setLoadingAuth(false);
    });
    return () => unsub();
  }, [loadCatalog, refreshWorkspace]);

  const signInWithGoogle = async () => {
    await signInWithPopup(auth, googleAuthProvider);
    await refreshWorkspace();
  };

  const signInWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
    await refreshWorkspace();
  };

  const registerWithEmail = async (email: string, password: string, name: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (name.trim()) {
      await updateProfile(cred.user, { displayName: name.trim() });
    }
    await refreshWorkspace();
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        dbUser,
        loadingAuth,
        projects,
        characters,
        renderJobs,
        subscription,
        aiModels,
        gpuNodes,
        cudaWorkerConfigured,
        cudaWorkerOnline,
        getToken,
        refreshWorkspace,
        signInWithGoogle,
        signInWithEmail,
        registerWithEmail,
        logout,
        authFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
