import styles from "./GameCard.module.css";
import type { MouseEvent } from "react";
import { buildAssetUrl } from "../../lib/env";

// Props para o card de jogo (lista ou destaque)
export interface GameCardProps {
  game: {
    id: number;
    title: string;
    year?: number | null;
    genre?: string | null;
    score?: number | null;
    favorite?: boolean;
    cover?: string | null;
    platforms?: string[];
  };
  onClick?: (gameId: number) => void;
  onToggleFavorite?: (gameId: number) => void;
  isToggling?: boolean;
}

export function GameCard({ game, onClick, onToggleFavorite, isToggling }: GameCardProps) {
	const coverSrc = game.cover ? buildAssetUrl(game.cover) : null;

	// Abre detalhes do jogo
  const handleClick = () => {
    if (onClick) onClick(game.id);
  };

	// Marca/desmarca favorito sem propagar clique
  const handleToggle = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (isToggling) return;
    if (onToggleFavorite) onToggleFavorite(game.id);
  };

  const isFavorite = Boolean(game.favorite);
  const starClassName = `${styles.star} ${isFavorite ? styles.starActive : ""} ${isToggling ? styles.starBusy : ""}`.trim();

  return (
    <article className={styles.card} onClick={handleClick}>
      <div className={styles.coverWrap}>
        {coverSrc ? (
          <img className={styles.cover} src={coverSrc} alt={game.title} loading="lazy" />
        ) : (
          <div className={styles.cover} aria-label="No cover available" />
        )}
        {typeof game.score === "number" && (
          <span className={styles.score}>{game.score.toFixed(1)}</span>
        )}
        <button
          type="button"
          className={starClassName}
          aria-label={isFavorite ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={isFavorite}
          aria-busy={isToggling}
          disabled={isToggling}
          onClick={handleToggle}
        >
          {isFavorite ? "★" : "☆"}
        </button>
      </div>

      <div className={styles.meta}>
        <div className={styles.titleRow}>
          <h3 className={styles.title}>{game.title}</h3>
          {game.year && <span className={styles.year}>{game.year}</span>}
        </div>

        {game.genre && <div className={styles.genre}>{game.genre}</div>}

        {game.platforms?.length ? (
          <div className={styles.platforms}>
            {game.platforms.slice(0, 4).map((p) => (
              <span key={p} className={styles.platformChip}>{p}</span>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}
