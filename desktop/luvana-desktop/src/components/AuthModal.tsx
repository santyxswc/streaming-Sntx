import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { api } from "@/config/api";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "login" | "register";
}

export default function AuthModal({ isOpen, onClose, initialMode = "login" }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const { login, register, error, loading, setError } = useAuthStore();
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setLocalError(null);
      setMode(initialMode);
    }
  }, [isOpen, initialMode, setError]);

  if (!isOpen) return null;

  const validatePassword = (pass: string): string | null => {
    if (pass.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
    if (!/[A-Z]/.test(pass)) return "La contraseña debe incluir al menos una mayúscula.";
    if (!/[0-9]/.test(pass)) return "La contraseña debe incluir al menos un número.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanDisplayName = displayName.trim().slice(0, 50);

    if (mode === "register") {
      const passError = validatePassword(password);
      if (passError) {
        setLocalError(passError);
        return;
      }
      if (!cleanDisplayName) {
        setLocalError("El nombre es obligatorio.");
        return;
      }
    }

    try {
      const limitRes = await fetch(api.authLimit(), { method: "POST" });
      const limitData = await limitRes.json();

      if (!limitData.success) {
        setLocalError(limitData.message || "Demasiados intentos. Intenta más tarde.");
        return;
      }

      if (mode === "login") {
        await login(cleanEmail, password);
      } else {
        await register(cleanEmail, password, cleanDisplayName);
      }
      onClose();
    } catch {
      // Error is handled by the store
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div
        className="relative bg-zinc-900 border border-zinc-800 w-full max-w-md p-8 rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-2 text-[var(--primary)]">
          {mode === "login" ? "Bienvenido de nuevo" : "Crea tu cuenta"}
        </h2>
        <p className="text-zinc-400 mb-8">
          {mode === "login" ? "Ingresa tus credenciales para continuar" : "Únete a Luvana y guarda tus favoritos"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Nombre</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)] transition-all"
                placeholder="Tu nombre"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)] transition-all"
              placeholder="correo@ejemplo.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)] transition-all"
              placeholder="••••••••"
            />
          </div>

          {(error || localError) && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-lg">
              {localError || error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-bold py-3 rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Procesando...
              </span>
            ) : mode === "login" ? "Iniciar Sesión" : "Registrarse"}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-zinc-500">
          {mode === "login" ? (
            <p>
              ¿No tienes cuenta?{" "}
              <button type="button" onClick={() => setMode("register")} className="text-[var(--primary)] hover:underline font-bold">
                Regístrate gratis
              </button>
            </p>
          ) : (
            <p>
              ¿Ya tienes cuenta?{" "}
              <button type="button" onClick={() => setMode("login")} className="text-[var(--primary)] hover:underline font-bold">
                Inicia sesión
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
