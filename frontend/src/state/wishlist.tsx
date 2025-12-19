import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Game } from "../types";
import { addToWishlist, fetchWishlist, removeFromWishlist } from "../lib/api";
import { useAuth } from "./auth";

interface WishlistContextValue {
  ids: Set<number>;
  items: Game[];
  loading: boolean;
  pending: Set<number>;
  error: string | null;
  refresh: () => Promise<void>;
  toggle: (gameId: number) => Promise<void>;
}

const WishlistContext = createContext<WishlistContextValue | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user, token, loading: authLoading } = useAuth();
  const [ids, setIds] = useState<Set<number>>(new Set());
  const [items, setItems] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Limpa estado local quando nao autenticado
  const clear = useCallback(() => {
    setIds(new Set());
    setItems([]);
    setPending(new Set());
    setError(null);
  }, []);

  // Recarrega wishlist do backend
  const refresh = useCallback(async () => {
    if (!user || !token) {
      clear();
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await fetchWishlist(token);
      setItems(result);
      setIds(new Set(result.map((g) => g.id)));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error loading wishlist.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [user, token, clear]);

  useEffect(() => {
    // Quando a auth muda, recarrega ou limpa
    if (authLoading) return;
    if (user && token) {
      void refresh();
    } else {
      clear();
    }
  }, [authLoading, user, token, refresh, clear]);

  // Adiciona ou remove jogo da wishlist com optimismo
  const toggle = useCallback(
    async (gameId: number) => {
      if (!user || !token) {
        throw new Error("Authentication required");
      }

      setError(null);
      setPending((current) => {
        const next = new Set(current);
        next.add(gameId);
        return next;
      });

      const alreadySaved = ids.has(gameId);
      let removedGame: Game | null = null;

      if (alreadySaved) {
        setIds((current) => {
          const next = new Set(current);
          next.delete(gameId);
          return next;
        });
        setItems((current) => {
          removedGame = current.find((g) => g.id === gameId) || null;
          return current.filter((g) => g.id !== gameId);
        });

        try {
          await removeFromWishlist(gameId, token);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Error updating wishlist.";
          setError(message);
          if (removedGame) {
            setItems((current) => {
              if (current.some((g) => g.id === gameId)) return current;
              return [...current, removedGame as Game];
            });
          }
          setIds((current) => {
            const next = new Set(current);
            next.add(gameId);
            return next;
          });
          throw err;
        } finally {
          setPending((current) => {
            const next = new Set(current);
            next.delete(gameId);
            return next;
          });
        }
        return;
      }

      setIds((current) => {
        const next = new Set(current);
        next.add(gameId);
        return next;
      });

      try {
        const added = await addToWishlist(gameId, token);
        setItems((current) => {
          if (current.some((g) => g.id === added.id)) return current;
          return [...current, added];
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error updating wishlist.";
        setError(message);
        setIds((current) => {
          const next = new Set(current);
          next.delete(gameId);
          return next;
        });
        throw err;
      } finally {
        setPending((current) => {
          const next = new Set(current);
          next.delete(gameId);
          return next;
        });
      }
    },
    [user, token, ids]
  );

  const value = useMemo(
    () => ({
      ids,
      items,
      loading,
      pending,
      error,
      refresh,
      toggle,
    }),
    [ids, items, loading, pending, error, refresh, toggle]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export const useWishlist = (): WishlistContextValue => {
  const ctx = useContext(WishlistContext);
  if (!ctx) {
    throw new Error("useWishlist must be used within WishlistProvider");
  }

  return ctx;
};
