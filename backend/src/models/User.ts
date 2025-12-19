// src/models/User.ts
import { query } from "../config/db";

export type UserRole = "user" | "admin" | "owner";

export interface User {
  id?: number;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  created_at?: Date;
}

const UserModel = {
  async findByEmail(email: string): Promise<User | null> {
    const result = await query<User>(
      "SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1",
      [email]
    );
    return result.rows[0] || null;
  },

  async findByName(name: string): Promise<User | null> {
    const result = await query<User>(
      "SELECT * FROM users WHERE LOWER(name) = LOWER($1) LIMIT 1",
      [name]
    );
    return result.rows[0] || null;
  },

  async findById(id: number): Promise<User | null> {
    const result = await query<User>(
      "SELECT * FROM users WHERE id = $1 LIMIT 1",
      [id]
    );
    return result.rows[0] || null;
  },

  async create(user: Omit<User, "id" | "created_at">): Promise<User> {
    const { name, email, password_hash, role } = user;

    const result = await query<User>(
      `
      INSERT INTO users (name, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [name, email, password_hash, role]
    );

    return result.rows[0];
  },
};

export default UserModel;
