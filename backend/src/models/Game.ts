// TODO: define Game model.
// src/models/Game.ts
import { query } from "../config/db";

export interface Game {
  id?: number;
  title: string;
  genre?: string | null;
  platform?: string | null;
  release_year?: number | null;
  description?: string | null;
  cover_url?: string | null;
  avg_rating?: number | null;
  review_count?: number | null;
  created_at?: Date;
}

export interface GameWithStats extends Game {
  avg_rating: number;
  review_count: number;
}

const SELECT_WITH_STATS = `
  SELECT g.*, COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0)::float AS avg_rating,
         COUNT(r.rating)::int AS review_count
  FROM games g
  LEFT JOIN reviews r ON r.game_id = g.id
`;

const GameModel = {
  async findAll(): Promise<GameWithStats[]> {
    const result = await query<GameWithStats>(
      `${SELECT_WITH_STATS}
      GROUP BY g.id
      ORDER BY g.title ASC`
    );
    return result.rows;
  },

  async findById(id: number): Promise<GameWithStats | null> {
    const result = await query<GameWithStats>(
      `${SELECT_WITH_STATS}
      WHERE g.id = $1
      GROUP BY g.id`,
      [id]
    );
    return result.rows[0] || null;
  },

  async findTop10ByRating(): Promise<GameWithStats[]> {
    const result = await query<GameWithStats>(
      `${SELECT_WITH_STATS}
      GROUP BY g.id
      ORDER BY avg_rating DESC, review_count DESC
      LIMIT 10`
    );
    return result.rows;
  },

  async findRandom(): Promise<GameWithStats | null> {
    const countResult = await query<{ count: string }>(
      "SELECT COUNT(*)::int AS count FROM games"
    );
    const total = countResult.rows[0]?.count ? Number(countResult.rows[0].count) : 0;
    if (!total) {
      return null;
    }

    const offset = Math.floor(Math.random() * total);
    const result = await query<GameWithStats>(
      `${SELECT_WITH_STATS}
      GROUP BY g.id
      OFFSET $1
      LIMIT 1`,
      [offset]
    );
    return result.rows[0] || null;
  },

  async create(game: Omit<Game, "id" | "created_at">): Promise<Game> {
    const { title, genre, platform, release_year, description, cover_url } =
      game;

    const result = await query<Game>(
      `
      INSERT INTO games (title, genre, platform, release_year, description, cover_url)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [title, genre, platform, release_year, description, cover_url]
    );

    const created = result.rows[0];
    return {
      ...created,
      avg_rating: 0,
      review_count: 0,
    };
  },

  async remove(id: number): Promise<void> {
    await query("DELETE FROM games WHERE id = $1", [id]);
  },
};

export default GameModel;
