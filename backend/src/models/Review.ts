// src/models/Review.ts
import { query } from "../config/db";

export interface Review {
  id?: number;
  game_id: number;
  user_id: number;
  rating: number | null;
  title?: string | null;
  body?: string | null;
  user_name?: string | null;
  user_role?: string | null;
  created_at?: Date;
}

const ReviewModel = {
  async findUserReview(gameId: number, userId: number): Promise<Review | null> {
    const result = await query<Review>(
      `
      SELECT r.*, u.name AS user_name, u.role AS user_role
      FROM reviews r
      JOIN users u ON u.id = r.user_id
      WHERE r.game_id = $1 AND r.user_id = $2
      ORDER BY r.created_at DESC
      LIMIT 1
      `,
      [gameId, userId]
    );
    return result.rows[0] ?? null;
  },
  async findByGame(gameId: number): Promise<Review[]> {
    const result = await query<Review>(
      `
      SELECT r.*, u.name AS user_name
            , u.role AS user_role
      FROM reviews r
      JOIN users u ON u.id = r.user_id
      WHERE r.game_id = $1
      ORDER BY r.created_at DESC
      `,
      [gameId]
    );
    return result.rows;
  },

  async findUserRating(gameId: number, userId: number): Promise<Review | null> {
    const result = await query<Review>(
      `
      SELECT r.*, u.name AS user_name, u.role AS user_role
      FROM reviews r
      JOIN users u ON u.id = r.user_id
      WHERE r.game_id = $1 AND r.user_id = $2 AND r.rating IS NOT NULL
      ORDER BY r.created_at DESC
      LIMIT 1
      `,
      [gameId, userId]
    );
    return result.rows[0] ?? null;
  },

  async create(review: Omit<Review, "id" | "created_at">): Promise<Review> {
    const { game_id, user_id, rating, title, body } = review;
    const result = await query<Review>(
      `
      WITH ins AS (
        INSERT INTO reviews (game_id, user_id, rating, title, body)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      )
      SELECT ins.*, u.name AS user_name
            , u.role AS user_role
      FROM ins
      JOIN users u ON u.id = ins.user_id
      `,
      [game_id, user_id, rating, title, body]
    );
    return result.rows[0];
  },

  async updateUserReview(
    gameId: number,
    userId: number,
    options: { rating?: number | null; title?: string | null; body?: string | null }
  ): Promise<Review | null> {
    const { rating, title, body } = options;
    const result = await query<Review>(
      `
      UPDATE reviews r
      SET rating = COALESCE($3, r.rating),
          title = COALESCE($4, r.title),
          body  = COALESCE($5, r.body)
      FROM users u
      WHERE r.game_id = $1 AND r.user_id = $2
      RETURNING r.*, u.name AS user_name, u.role AS user_role
      `,
      [gameId, userId, rating ?? null, title ?? null, body ?? null]
    );
    return result.rows[0] ?? null;
  },

  async delete(
    id: number,
    userId: number,
    isAdmin: boolean
  ): Promise<boolean> {
    const result = isAdmin
      ? await query("DELETE FROM reviews WHERE id = $1", [id])
      : await query(
          "DELETE FROM reviews WHERE id = $1 AND user_id = $2",
          [id, userId]
        );

    return Boolean(result.rowCount && result.rowCount > 0);
  },

  async clearRating(id: number, userId: number, isAdmin: boolean): Promise<Review | null> {
    const result = await query<Review>(
      `
      UPDATE reviews r
      SET rating = NULL
      FROM users u
      WHERE r.id = $1
        AND (r.user_id = $2 OR $3 = TRUE)
      RETURNING r.*, u.name AS user_name, u.role AS user_role
      `,
      [id, userId, isAdmin]
    );
    return result.rows[0] ?? null;
  },

  async clearComment(id: number, userId: number, isAdmin: boolean): Promise<Review | null> {
    const result = await query<Review>(
      `
      UPDATE reviews r
      SET title = NULL, body = NULL
      FROM users u
      WHERE r.id = $1
        AND (r.user_id = $2 OR $3 = TRUE)
      RETURNING r.*, u.name AS user_name, u.role AS user_role
      `,
      [id, userId, isAdmin]
    );
    return result.rows[0] ?? null;
  },
};

export default ReviewModel;
