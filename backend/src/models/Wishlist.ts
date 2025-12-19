// src/models/Wishlist.ts
import { query } from "../config/db";
import { Game } from "./Game";

const WishlistModel = {
  async getByUser(userId: number): Promise<Game[]> {
    const result = await query<Game>(
      `
      SELECT g.*
      FROM wishlist w
      JOIN games g ON g.id = w.game_id
      WHERE w.user_id = $1
      ORDER BY g.title ASC
      `,
      [userId]
    );
    return result.rows;
  },

  async add(userId: number, gameId: number): Promise<Game | null> {
    const gameResult = await query<Game>(
      "SELECT * FROM games WHERE id = $1",
      [gameId]
    );
    const game = gameResult.rows[0] || null;
    if (!game) {
      return null;
    }

    await query(
      `
      INSERT INTO wishlist (user_id, game_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, game_id) DO NOTHING
      `,
      [userId, gameId]
    );
    return game;
  },

  async remove(userId: number, gameId: number): Promise<boolean> {
    const result = await query(
      `
      DELETE FROM wishlist
      WHERE user_id = $1 AND game_id = $2
      `,
      [userId, gameId]
    );
    return Boolean(result.rowCount && result.rowCount > 0);
  },
};

export default WishlistModel;
