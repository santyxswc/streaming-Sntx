import { create } from "zustand";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

const mapAuthCodeToMessage = (code: string): string => {
  switch (code) {
    case "auth/invalid-email":
      return "El correo electrónico no es válido.";
    case "auth/user-disabled":
      return "Esta cuenta ha sido deshabilitada.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Correo o contraseña incorrectos.";
    case "auth/email-already-in-use":
      return "Este correo ya está registrado.";
    case "auth/weak-password":
      return "La contraseña es demasiado débil.";
    case "auth/password-does-not-meet-requirements":
      return "La contraseña debe tener al menos 8 caracteres, una mayúscula y un número.";
    case "auth/too-many-requests":
      return "Demasiados intentos fallidos. Por favor, inténtalo más tarde.";
    default:
      return "Ocurrió un error inesperado. Inténtalo de nuevo.";
  }
};

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  initAuth: () => () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
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
    } catch (error: unknown) {
      const err = error as { code?: string };
      const message = mapAuthCodeToMessage(err.code || "");
      set({ error: message, loading: false });
      throw error;
    }
  },

  register: async (email, password, displayName) => {
    set({ loading: true, error: null });
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName });
      set({ user: { ...userCredential.user, displayName } as User, loading: false });
    } catch (error: unknown) {
      const err = error as { code?: string };
      const message = mapAuthCodeToMessage(err.code || "");
      set({ error: message, loading: false });
      throw error;
    }
  },

  logout: async () => {
    set({ loading: true, error: null });
    try {
      await signOut(auth);
      set({ user: null, loading: false });
    } catch (error: unknown) {
      const err = error as Error;
      set({ error: err.message, loading: false });
    }
  },

  initAuth: () => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      set({ user, loading: false });
    });
    return unsubscribe;
  },
}));
