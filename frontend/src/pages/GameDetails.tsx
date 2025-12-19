import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styles from "./GameDetails.module.css";
import { Header } from "../components/Header/Header";
import { RatingBar } from "../components/RatingBar/RatingBar";
import { ModalAuth, type AuthMode } from "../components/ModalAuth/ModalAuth";
import { ConfirmModal } from "../components/ConfirmModal/ConfirmModal";
import { buildAssetUrl } from "../lib/env";
import {
  apiRequest,
  clearReviewComment,
  clearReviewRating,
  deleteGame,
  fetchGameById,
  fetchReviewsByGame,
  submitReview,
} from "../lib/api";
import type { AuthResponse, Game, Review } from "../types";
import { useAuth } from "../state/auth";
import { useWishlist } from "../state/wishlist";
import { GameCard } from "../components/GameCard/GameCard";

// Remove tags perigosas e atributos antes de exibir HTML de descrição
const sanitizeDescription = (html: string): string => {
  if (!html) return "";
  if (typeof window === "undefined" || typeof DOMParser === "undefined") return html;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    doc.querySelectorAll("script,style,iframe,object,embed,link,meta").forEach((el) => el.remove());

    doc.querySelectorAll("*").forEach((el) => {
      Array.from(el.attributes).forEach((attr) => {
        const name = attr.name.toLowerCase();
        if (name.startsWith("on") || name === "style") {
          el.removeAttribute(attr.name);
        }
        if (name === "src" && el.tagName.toLowerCase() === "img") {
          const src = el.getAttribute("src");
          if (src && src.trim().toLowerCase().startsWith("javascript:")) {
            el.removeAttribute("src");
          }
        }
      });

      if (el.tagName.toLowerCase() === "a") {
        el.setAttribute("rel", "noopener noreferrer");
        if (!el.getAttribute("target")) el.setAttribute("target", "_blank");
      }
    });

    return doc.body ? doc.body.innerHTML : html;
  } catch (err) {
    console.warn("Failed to sanitise description", err);
    return html;
  }
};

// Separa géneros em tokens normalizados
const tokenizeGenre = (value?: string | null): Set<string> => {
  if (!value) return new Set();
  return new Set(
    value
      .toLowerCase()
      .split(/[/,&|]+|,/)
      .flatMap((chunk) => chunk.split(/\s+/))
      .map((token) => token.trim())
      .filter((token) => token.length > 1)
  );
};

// Escolhe jogos com géneros/plataformas semelhantes
const pickSimilar = (current: Game | null, catalog: Game[]): Game[] => {
  if (!current) return [];
  const currentGenres = tokenizeGenre(current.genre);
  if (!currentGenres.size) return [];
  const platformTokens = (current.platform || "")
    .split(/[,+/]/)
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);

  const scored = catalog
    .filter((g) => g.id !== current.id)
    .map((g) => {
      const targetGenres = tokenizeGenre(g.genre);
      const sharedGenres = Array.from(targetGenres).filter((token) => currentGenres.has(token));
      if (!sharedGenres.length) return null;
      let score = sharedGenres.length * 3;
      const overlaps = platformTokens.filter((p) => (g.platform || "").toLowerCase().includes(p)).length;
      score += overlaps;
      return { game: g, score };
    })
    .filter((entry): entry is { game: Game; score: number } => Boolean(entry))
    .sort((a, b) => b.score - a.score || (b.game.avg_rating || 0) - (a.game.avg_rating || 0));

  return scored.slice(0, 5).map((entry) => entry.game);
};

const COMMENT_MAX_LEN = 1000;

type ViewReview = Review & { user_name?: string | null; user_role?: string | null };

// Garante que ratings vêm como número ou null
const normalizeReviews = (items: Review[]): ViewReview[] =>
  items.map((r) => {
    const parsed = Number(r.rating);
    return {
      ...r,
      rating: Number.isFinite(parsed) ? parsed : null,
    };
  });

const isPrivileged = (role?: string | null) => role === "admin" || role === "owner";

export default function GameDetails() {
	// Hooks de routing e estado principal
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const gameId = useMemo(() => Number(id), [id]);

  const [game, setGame] = useState<Game | null>(null);
  const [reviews, setReviews] = useState<ViewReview[]>([]);
  const [catalog, setCatalog] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ratingBusy, setRatingBusy] = useState(false);
  const [clearBusy, setClearBusy] = useState<"rating" | "comment" | null>(null);
  const [deleteGameBusy, setDeleteGameBusy] = useState(false);
  const [deleteGameConfirmOpen, setDeleteGameConfirmOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false);

  const { user, token, setSession, logout } = useAuth();
  const { ids: wishlistIds, toggle: toggleWishlist, pending: wishlistPending } = useWishlist();

  useEffect(() => {
    // Carrega jogo, reviews e catálogo para recomendação
    if (!Number.isFinite(gameId)) {
      setError("Invalid game");
      setLoading(false);
      return;
    }
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [gameData, reviewData, catalogData] = await Promise.all([
          fetchGameById(gameId),
          fetchReviewsByGame(gameId),
          apiRequest<Game[]>("/games"),
        ]);
        setGame(gameData);
        setReviews(normalizeReviews(reviewData));
        setCatalog(catalogData);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error loading game";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [gameId]);

  // Abre modal de auth no modo indicado
  const openAuthModal = (mode: AuthMode = "login") => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const handleAuthSuccess = (payload: AuthResponse) => {
    setSession(payload);
    setAuthModalOpen(false);
  };

  const handleSignOut = () => {
    setSignOutConfirmOpen(true);
  };

  const handleConfirmSignOut = () => {
    setSignOutConfirmOpen(false);
    void logout();
  };

  const handleCancelSignOut = () => {
    setSignOutConfirmOpen(false);
  };

  // Só admins/owner podem pedir remoção do jogo
  const handleRequestDeleteGame = () => {
    if (!isPrivileged(user?.role)) return;
    setDeleteGameConfirmOpen(true);
  };

  // Confirma e apaga jogo (admin/owner)
  const handleConfirmDeleteGame = async () => {
    if (!gameId) return;
    if (!user || !token) {
      openAuthModal("login");
      return;
    }

    if (!isPrivileged(user.role)) return;

    setDeleteGameBusy(true);
    setError(null);
    try {
      await deleteGame(gameId, token);
      navigate("/");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete game";
      setError(message);
    } finally {
      setDeleteGameBusy(false);
      setDeleteGameConfirmOpen(false);
    }
  };

  const handleCancelDeleteGame = () => setDeleteGameConfirmOpen(false);

  // Marca/desmarca wishlist; abre auth se anónimo
  const handleToggleWishlist = async (targetId?: number) => {
    const target = targetId ?? gameId;
    if (!target) return;
    if (!user) {
      openAuthModal("login");
      return;
    }

    try {
      await toggleWishlist(target);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error updating wishlist";
      setError(message);
    }
  };

  // Recarrega jogo + reviews após ações
  const refreshGameData = async () => {
    if (!gameId) return;
    const [gameData, reviewData] = await Promise.all([fetchGameById(gameId), fetchReviewsByGame(gameId)]);
    setGame(gameData);
    setReviews(normalizeReviews(reviewData));
  };

  // Envia nova pontuação
  const handleSubmitRating = async (value: number) => {
    if (!gameId) return;
    if (!user || !token) {
      openAuthModal("login");
      return;
    }
    setRatingBusy(true);
    setError(null);
    try {
      await submitReview(gameId, value, token);
      await refreshGameData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to submit rating";
      setError(message);
    } finally {
      setRatingBusy(false);
    }
  };

  // Limpa a pontuação do utilizador
  const handleClearRating = async () => {
    if (!myRatingReview || !myRatingReview.id) return;
    if (!user || !token) {
      openAuthModal("login");
      return;
    }
    setClearBusy("rating");
    setError(null);
    try {
      await clearReviewRating(myRatingReview.id, token);
      await refreshGameData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to clear rating";
      setError(message);
    } finally {
      setClearBusy(null);
    }
  };

  // Limpa comentário textual
  const handleClearComment = async (reviewId: number) => {
    if (!user || !token) {
      openAuthModal("login");
      return;
    }

    setClearBusy("comment");
    setError(null);
    try {
      await clearReviewComment(reviewId, token);
      await refreshGameData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to clear comment";
      setError(message);
    } finally {
      setClearBusy(null);
    }
  };

  // Submete comentário textual
  const handleSubmitComment = async (event: FormEvent) => {
    event.preventDefault();
    if (!gameId) return;
    if (!user || !token) {
      openAuthModal("login");
      return;
    }

    if (!commentBody.trim()) {
      setError("Please write a comment before sending.");
      return;
    }

    const trimmedBody = commentBody.trim();

    if (trimmedBody.length > COMMENT_MAX_LEN) {
      setError(`Comment too long (max ${COMMENT_MAX_LEN} characters).`);
      return;
    }

    setCommentBusy(true);
    setError(null);
    try {
      await submitReview(gameId, null, token, {
        body: trimmedBody,
      });
      setCommentBody("");
      await refreshGameData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to submit comment";
      setError(message);
    } finally {
      setCommentBusy(false);
    }
  };

  const coverUrl = buildAssetUrl(game?.cover_url);
  const isInWishlist = gameId ? wishlistIds.has(gameId) : false;
  const wishlistIsPending = gameId ? wishlistPending.has(gameId) : false;
  const average = typeof game?.avg_rating === "number" ? game.avg_rating.toFixed(1) : "--";
  const reviewsCount = game?.review_count ?? 0;
  const safeDescription = useMemo(() => sanitizeDescription(game?.description || ""), [game?.description]);
  const similarGames = useMemo(() => pickSimilar(game, catalog), [game, catalog]);
  const commentReviews = useMemo(
    () => reviews.filter((r) => Boolean(r.body?.trim()) || Boolean(r.title?.trim())),
    [reviews]
  );
  const myRatingReview = useMemo(
    () => (user ? reviews.find((r) => r.user_id === user.id && r.rating !== null) ?? null : null),
    [reviews, user]
  );

  const canDeleteGame = isPrivileged(user?.role);
  const deleteGameDisabled = deleteGameBusy || !user || !canDeleteGame;
  const deleteGameTitle = !user
    ? "Sign in as admin/owner to delete"
    : !canDeleteGame
      ? "Only admins or owners can delete"
      : undefined;

  if (loading) {
    return (
      <>
        <div className={styles.page}>
          <Header onAuthClick={() => openAuthModal("login")} user={user} onSignOut={handleSignOut} />
          <div className={styles.fallback}>Loading game...</div>
        </div>
        <ConfirmModal
          open={signOutConfirmOpen}
          title="Sign out"
          description="Are you sure you want to sign out?"
          confirmLabel="Sign out"
          cancelLabel="Cancel"
          onConfirm={handleConfirmSignOut}
          onCancel={handleCancelSignOut}
        />
      </>
    );
  }

  if (error || !game) {
    return (
      <>
        <div className={styles.page}>
          <Header onAuthClick={() => openAuthModal("login")} user={user} onSignOut={handleSignOut} />
          <div className={styles.fallback}>
            <div className={styles.error}>{error ?? "Game not found"}</div>
            <button type="button" className={styles.backBtn} onClick={() => navigate(-1)}>
              {"<- Back"}
            </button>
          </div>
        </div>
        <ConfirmModal
          open={signOutConfirmOpen}
          title="Sign out"
          description="Are you sure you want to sign out?"
          confirmLabel="Sign out"
          cancelLabel="Cancel"
          onConfirm={handleConfirmSignOut}
          onCancel={handleCancelSignOut}
        />

        <ConfirmModal
          open={deleteGameConfirmOpen}
          title="Delete game"
          description="This will permanently remove the game and its reviews. Continue?"
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={handleConfirmDeleteGame}
          onCancel={handleCancelDeleteGame}
        />
      </>
    );
  }

  return (
    <>
      <div className={styles.page}>
        <Header onAuthClick={() => openAuthModal("login")} user={user} onSignOut={handleSignOut} />

        <main className={styles.main}>
          <button type="button" className={styles.backBtn} onClick={() => navigate(-1)}>
            {"<- Back"}
          </button>

          <section className={styles.hero}>
            {coverUrl ? (
              <img className={styles.cover} src={coverUrl} alt={game.title} />
            ) : (
              <div className={styles.coverPlaceholder} aria-label="No cover" />
            )}

            <div className={styles.heroContent}>
              <div className={styles.breadcrumb}>{"Game > Details"}</div>
              <h1 className={styles.title}>{game.title}</h1>

              <div className={styles.metaRow}>
                {game.release_year && <span className={styles.tag}>{game.release_year}</span>}
                {game.genre && <span className={styles.tag}>{game.genre}</span>}
                {game.platform && <span className={styles.tag}>{game.platform}</span>}
              </div>

              <div className={styles.statsRow}>
                <div className={styles.statBlock}>
                  <div className={styles.statLabel}>AVERAGE</div>
                  <div className={styles.statValue}>{average}</div>
                </div>
                <div className={styles.statBlock}>
                  <div className={styles.statLabel}>REVIEWS</div>
                  <div className={styles.statValue}>{reviewsCount}</div>
                </div>
              </div>

              <div className={styles.actions}>
                <button
                  type="button"
                  className={`${styles.wishlistBtn} ${isInWishlist ? styles.wishlistActive : ""}`}
                  onClick={() => handleToggleWishlist()}
                  disabled={wishlistIsPending}
                >
                  {isInWishlist ? "Remove from wishlist" : "Add to wishlist"}
                </button>
                {canDeleteGame && (
                  <button
                    type="button"
                    className={styles.dangerBtn}
                    onClick={handleRequestDeleteGame}
                    disabled={deleteGameDisabled}
                    title={deleteGameTitle}
                  >
                    {deleteGameBusy ? "Deleting..." : "Delete game"}
                  </button>
                )}
              </div>

              <div className={styles.ratingPanel}>
                <RatingBar
                  value={game.avg_rating ?? 0}
                  onChange={handleSubmitRating}
                  disabled={ratingBusy}
                  label="RATE THIS GAME!"
                  hint="Hover and click to give a rating"
                />
                {myRatingReview?.rating !== null && myRatingReview?.rating !== undefined && (
                  <div className={styles.ratingActions}>
                    <button
                      type="button"
                      className={styles.backBtn}
                      onClick={handleClearRating}
                      disabled={clearBusy === "rating"}
                    >
                      {clearBusy === "rating" ? "Clearing rating..." : "Remove rating"}
                    </button>
                  </div>
                )}
                {error && <div className={styles.inlineError}>{error}</div>}
              </div>
            </div>
          </section>

          <section className={styles.description}>
            <h2>About the game</h2>
            <div
              className={styles.descriptionContent}
              dangerouslySetInnerHTML={{ __html: safeDescription || "No description available." }}
            />
          </section>

          <div className={styles.sectionDivider} aria-hidden="true" />

          <section className={styles.similar}>
            <div className={`${styles.sectionHeader} ${styles.similarHeader}`}>
              <div>
                <h2>Similar games</h2>
              </div>
              <button type="button" className={styles.backBtn} onClick={() => navigate("/")}>
                See all
              </button>
            </div>
            {similarGames.length ? (
              <div className={styles.similarScroller}>
                <div className={styles.similarRow}>
                  {similarGames.map((g) => (
                    <GameCard
                      key={g.id}
                      game={{
                        id: g.id,
                        title: g.title,
                        year: g.release_year,
                        genre: g.genre,
                        score: g.avg_rating,
                        favorite: wishlistIds.has(g.id),
                        cover: buildAssetUrl(g.cover_url),
                        platforms: g.platform ? g.platform.split(/[,+]/).map((p) => p.trim()).filter(Boolean) : [],
                      }}
                      onClick={(targetId) => navigate(`/games/${targetId}`)}
                      onToggleFavorite={() => handleToggleWishlist(g.id)}
                      isToggling={wishlistPending.has(g.id)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className={styles.empty}>No suggestions yet.</div>
            )}
          </section>

          <section className={styles.comments}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.eyebrow}>Share your thoughts</p>
                <h2>Comments</h2>
              </div>
            </div>

            <form className={styles.commentForm} onSubmit={handleSubmitComment}>
              <textarea
                className={styles.commentTextarea}
                placeholder="Write your comment..."
                rows={4}
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value.slice(0, COMMENT_MAX_LEN))}
                disabled={commentBusy}
                maxLength={COMMENT_MAX_LEN}
              />
              <div className={styles.commentActions}>
                <button type="submit" className={styles.primaryBtn} disabled={commentBusy}>
                  {commentBusy ? "Sending..." : "Post comment"}
                </button>
                <button
                  type="button"
                  className={styles.backBtn}
                  onClick={() => {
                    setCommentBody("");
                  }}
                  disabled={commentBusy}
                >
                  Clear
                </button>
              </div>
              {error && <div className={styles.inlineError}>{error}</div>}
            </form>
          </section>

          <section className={styles.reviews}>
            <div className={styles.reviewsHeader}>
              <h2>Recent reviews</h2>
              <span className={styles.reviewCount}>{commentReviews.length}</span>
            </div>
            {commentReviews.length === 0 ? (
              <p className={styles.empty}>No reviews yet. Be the first!</p>
            ) : (
              <ul className={styles.reviewList}>
                {commentReviews.map((rev) => {
                  const reviewerName = rev.user_name?.trim() || "Player";
                  const comment = rev.body?.trim() || rev.title?.trim() || "No comment.";
                  const isOwner = rev.user_role === "owner";
                  const ratingText = rev.rating != null ? Number(rev.rating).toFixed(1) : "--";
                  const canDelete = user && (user.id === rev.user_id || isPrivileged(user.role));
                  return (
                    <li key={rev.id} className={styles.reviewItem}>
                      <div className={styles.reviewHeaderRow}>
                        <span className={styles.reviewRatingPill}>{ratingText}</span>
                        <div className={styles.reviewName}>
                          {reviewerName}{" "}
                          {isOwner && <span className={styles.reviewCrown} aria-label="Owner badge">👑</span>}
                        </div>
                        {canDelete && (
                          <div className={styles.reviewActions}>
                            {(rev.body || rev.title) && (
                              <button
                                type="button"
                                className={styles.reviewDelete}
                                onClick={() => handleClearComment(rev.id)}
                                disabled={clearBusy === "comment"}
                              >
                                {clearBusy === "comment" ? "Clearing..." : "Delete comment"}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      <div className={styles.reviewText}>{comment}</div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </main>
      </div>

      <ModalAuth
        open={isAuthModalOpen}
        defaultMode={authMode}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      <ConfirmModal
        open={signOutConfirmOpen}
        title="Sign out"
        description="Are you sure you want to sign out?"
        confirmLabel="Sign out"
        cancelLabel="Cancel"
        onConfirm={handleConfirmSignOut}
        onCancel={handleCancelSignOut}
      />

      <ConfirmModal
        open={deleteGameConfirmOpen}
        title="Delete game"
        description="This will permanently remove the game and its reviews. Continue?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleConfirmDeleteGame}
        onCancel={handleCancelDeleteGame}
      />
    </>
  );
}





