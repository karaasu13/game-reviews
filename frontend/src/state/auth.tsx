import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { apiRequest, logoutUser } from "../lib/api";
import type { AuthResponse, UserSummary } from "../types";

const STORAGE_KEY = "game-reviews:session";

interface AuthContextValue {
  user: UserSummary | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (payload: AuthResponse) => void;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  setSession: (session: AuthResponse | null) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Lê a sessão guardada no localStorage (se existir)
const readStoredSession = (): AuthResponse | null => {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthResponse;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Guarda ou remove a sessão persistida
  const persistSession = useCallback((session: AuthResponse | null) => {
    if (typeof window === "undefined") return;
    if (!session) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }, []);

  // Limpa estado local e storage
  const clearSession = useCallback(() => {
    setUser(null);
    setToken(null);
    setError(null);
    persistSession(null);
  }, [persistSession]);

  useEffect(() => {
    // Arranque: tenta recuperar sessão guardada e validar no backend
    const bootstrap = async () => {
      const stored = readStoredSession();
      if (!stored) {
        setLoading(false);
        return;
      }

      setToken(stored.token);

      try {
        const me = await apiRequest<UserSummary>("/users/me", {
          method: "GET",
          token: stored.token,
        });
        setUser(me);
        persistSession({ token: stored.token, user: me });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Session expired. Please log in again.";
        setError(message);
        clearSession();
      } finally {
        setLoading(false);
      }
    };

    void bootstrap();
  }, [clearSession, persistSession]);

  const login = useCallback(
    // Atualiza estado e storage ao receber sessão válida
    (payload: AuthResponse) => {
      setUser(payload.user);
      setToken(payload.token);
      setError(null);
      persistSession(payload);
    },
    [persistSession]
  );

  // Termina sessão local e tenta revogar no backend
  const logout = useCallback(async () => {
    const authToken = token;
    clearSession();

    if (!authToken) return;

    try {
      await logoutUser(authToken);
    } catch (err) {
      console.warn("Failed to end session on backend:", err);
    }
  }, [token, clearSession]);

  // Força revalidação da sessão no backend
  const refreshSession = useCallback(async () => {
    if (!token) return false;
    try {
      const me = await apiRequest<UserSummary>("/users/me", {
        method: "GET",
        token,
      });
      setUser(me);
      persistSession({ token, user: me });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Session expired. Please log in again.";
      setError(message);
      clearSession();
      return false;
    }
  }, [token, clearSession, persistSession]);

  // Valor exposto pelo contexto
  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      error,
      login,
      logout,
      refreshSession,
      setSession: (session: AuthResponse | null) => {
        if (!session) {
          clearSession();
          return;
        }

        login(session);
      },
    }),
    [user, token, loading, error, login, logout, refreshSession, clearSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return ctx;
};
