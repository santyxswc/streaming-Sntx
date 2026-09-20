'use client';
import { create } from 'zustand';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  updateProfile
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@/lib/firebase';

const mapAuthCodeToMessage = (code) => {
  switch (code) {
    case 'auth/invalid-email':
      return 'El correo electrónico no es válido.';
    case 'auth/user-disabled':
      return 'Esta cuenta ha sido deshabilitada.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Correo o contraseña incorrectos.';
    case 'auth/email-already-in-use':
      return 'Este correo ya está registrado.';
    case 'auth/weak-password':
      return 'La contraseña es demasiado débil.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos fallidos. Por favor, inténtalo más tarde.';
    default:
      return 'Ocurrió un error inesperado. Inténtalo de nuevo.';
  }
};

export const useAuthStore = create((set) => ({
  user: null,
  loading: true,
  error: null,

  setUser: (user) => set({ user, loading: false }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      const message = mapAuthCodeToMessage(error.code);
      set({ error: message, loading: false });
      throw error;
    }
  },

  register: async (email, password, displayName) => {
    set({ loading: true, error: null });
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName });
      set({ user: { ...userCredential.user, displayName }, loading: false });
    } catch (error) {
      const message = mapAuthCodeToMessage(error.code);
      set({ error: message, loading: false });
      throw error;
    }
  },

  logout: async () => {
    set({ loading: true, error: null });
    try {
      await signOut(auth);
      set({ user: null, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  initAuth: () => {
    if (!isFirebaseConfigured || !auth) {
      set({ user: null, loading: false });
      return () => {};
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      set({ user, loading: false });
    });
    return unsubscribe;
  }
}));
