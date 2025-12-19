import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import styles from "./Wishlist.module.css";
import { Header } from "../components/Header/Header";
import { GameCard } from "../components/GameCard/GameCard";
import { buildAssetUrl } from "../lib/env";
import { useAuth } from "../state/auth";
import { useWishlist } from "../state/wishlist";
import { ConfirmModal } from "../components/ConfirmModal/ConfirmModal";

export default function WishlistPage() {
	// Estados e dependências de auth/wishlist
  const { user, loading: authLoading, logout } = useAuth();
  const { items, ids, pending, loading, error, toggle } = useWishlist();
  const [localError, setLocalError] = useState<string | null>(null);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const redirectTarget = `${location.pathname}${location.search || ""}`;

  useEffect(() => {
		// Se não autenticado, redireciona para login
    if (authLoading) return;
    if (!user) {
      navigate("/signin", { replace: true, state: { redirect: redirectTarget } });
    }
  }, [authLoading, user, navigate, redirectTarget]);

  // Normaliza itens para o GameCard
  const mappedItems = useMemo(
    () =>
      items
        .slice()
        .sort((a, b) => a.title.localeCompare(b.title))
        .map((g) => ({
          id: g.id,
          title: g.title,
          year: g.release_year,
          genre: g.genre,
          score: g.avg_rating,
          favorite: ids.has(g.id),
          cover: buildAssetUrl(g.cover_url),
          platforms: g.platform
            ? g.platform.split(/[,+]/).map((p) => p.trim()).filter(Boolean)
            : [],
        })),
    [items, ids]
  );

  // Adiciona/remove da wishlist; pede login se anónimo
  const handleToggleWishlist = async (gameId: number) => {
    if (!user) {
      navigate("/signin", { state: { redirect: redirectTarget } });
      return;
    }

    setLocalError(null);
    try {
      await toggle(gameId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error updating wishlist.";
      setLocalError(message);
    }
  };

  // Confirma e termina sessão
  const handleConfirmLogout = async () => {
    setLogoutOpen(false);
    setLocalError(null);
    await logout();
    navigate("/", { replace: true });
  };

  const showEmpty = !loading && mappedItems.length === 0;

  if (authLoading && !user) {
    return (
      <div className={styles.page}>
        <Header
          onAuthClick={() => navigate("/signin", { state: { redirect: redirectTarget } })}
          onWishlistClick={() => navigate("/wishlist")}
          user={user}
        />
        <main className={styles.main}>
          <div className={styles.loading}>Checking session...</div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Header
        onAuthClick={() => navigate("/signin", { state: { redirect: redirectTarget } })}
        onWishlistClick={() => navigate("/wishlist")}
        user={user}
        onSignOut={() => setLogoutOpen(true)}
      />

      <main className={styles.main}>
        <div className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>Personal collection</p>
            <h1 className={styles.h1}>Your wishlist</h1>
            <p className={styles.lede}>
              Games you marked as favorites live here. Use the star to remove them anytime.
            </p>
          </div>
          <div className={styles.heroActions}>
            <button
              type="button"
              className={styles.backBtn}
              onClick={() => navigate("/")}
            >
              Back to home
            </button>
          </div>
        </div>

        {(error || localError) && (
          <div className={styles.error} role="alert">
            {error || localError}
          </div>
        )}

        {loading ? (
          <div className={styles.loading}>Loading your wishlist...</div>
        ) : showEmpty ? (
          <div className={styles.emptyState}>
            <h3>Your wishlist is empty.</h3>
            <p>Browse games on the homepage and tap the star to save them here.</p>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={() => navigate("/")}
            >
              Go to home
            </button>
          </div>
        ) : (
          <div className={styles.grid}>
            {mappedItems.map((g) => (
              <GameCard
                key={g.id}
                game={g}
                onToggleFavorite={handleToggleWishlist}
                isToggling={pending.has(g.id)}
                onClick={(gameId) => navigate(`/games/${gameId}`)}
              />
            ))}
          </div>
        )}
      </main>

      <ConfirmModal
        open={logoutOpen}
        title="Sign out"
        description="Are you sure you want to sign out?"
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        onConfirm={handleConfirmLogout}
        onCancel={() => setLogoutOpen(false)}
      />
    </div>
  );
}
