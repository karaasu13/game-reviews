import { useMemo, useState } from "react";
import styles from "./GameSearch.module.css";
import { GameCard } from "../GameCard/GameCard";
import type { Game } from "../../types";
import { buildAssetUrl } from "../../lib/env";

// Props para pesquisa e filtro de jogos
export interface GameSearchProps {
  catalog: Game[];
  wishlistIds?: Set<number>;
  onToggleWishlist?: (gameId: number) => void;
  pendingIds?: Set<number>;
  onGameOpen?: (gameId: number) => void;
}

// Lista de plataformas para filtros rápidos
const platformOptions = [
  { id: "all", label: "All" },
  { id: "pc", label: "PC" },
  { id: "ps4", label: "PS4" },
  { id: "ps5", label: "PS5" },
  { id: "switch", label: "Switch" },
  { id: "xbox-one", label: "Xbox One" },
  { id: "xbox-series", label: "Xbox Series" },
  { id: "mobile", label: "Mobile" },
];

// Normaliza string de plataformas em tokens canónicos
const normalizePlatforms = (raw?: string | null) => {
  if (!raw) return new Set<string>();
  const tokens = raw
    .split(/[,+/]/)
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);

  const mapped = tokens.map((p) => {
    if (p.includes("pc")) return "pc";
    if (p.includes("ps5")) return "ps5";
    if (p.includes("ps4")) return "ps4";
    if (p.includes("switch")) return "switch";
    if (p.includes("series")) return "xbox-series";
    if (p.includes("xbox one")) return "xbox-one";
    if (p.startsWith("xbox")) return "xbox-one";
    if (p.includes("mobile")) return "mobile";
    return p;
  });

  return new Set(mapped);
};

export function GameSearch({
  catalog,
  wishlistIds,
  onToggleWishlist,
  pendingIds,
  onGameOpen,
}: GameSearchProps) {
  const [q, setQ] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set());

	// Liga/desliga filtro de plataforma
  const togglePlatform = (id: string) => {
    setSelectedPlatforms((current) => {
      if (id === "all") return new Set();
      const next = new Set(current);
      next.delete("all");
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Filtra catálogo pelo texto e plataformas selecionadas
  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    return catalog.filter((g) => {
      const matchesQ =
        !query ||
        g.title.toLowerCase().includes(query) ||
        (g.genre || "").toLowerCase().includes(query);

      const normalized = normalizePlatforms(g.platform);
      const hasFilter = selectedPlatforms.size > 0;
      const matchesPlatform =
        !hasFilter || Array.from(selectedPlatforms).some((p) => normalized.has(p));

      return matchesQ && matchesPlatform;
    });
  }, [q, selectedPlatforms, catalog]);

  return (
    <section className={styles.section}>
      <div className={styles.headerRow}>
        <h2 className={styles.h2}>Search games</h2>
        <p className={styles.sub}>Search by title, genre or filter by platform.</p>
      </div>

      <div className={styles.controls}>
        <input
          className={styles.input}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="e.g. Hollow Knight, RPG, shooter..."
        />

        <div className={styles.platforms}>
          <div className={styles.platformsLabel}>Platforms</div>
          <div className={styles.chipRow}>
            {platformOptions.map((p) => {
              const isActive =
                (p.id === "all" && selectedPlatforms.size === 0) ||
                selectedPlatforms.has(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`${styles.chip} ${isActive ? styles.chipActive : ""}`}
                  onClick={() => togglePlatform(p.id)}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className={styles.grid}>
        {results.length ? (
          results.map((g) => (
            <GameCard
              key={g.id}
              game={{
                id: g.id,
                title: g.title,
                year: g.release_year,
                genre: g.genre,
                score: g.avg_rating,
                favorite: wishlistIds?.has(g.id),
                cover: buildAssetUrl(g.cover_url),
                platforms: g.platform
                  ? g.platform.split(/[,+]/).map((p) => p.trim()).filter(Boolean)
                  : [],
              }}
              onToggleFavorite={onToggleWishlist}
              isToggling={pendingIds?.has(g.id)}
              onClick={onGameOpen}
            />
          ))
        ) : (
          <div className={styles.empty}>No results. Try another search.</div>
        )}
      </div>
    </section>
  );
}
