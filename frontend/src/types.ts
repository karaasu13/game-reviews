export type UserRole = "user" | "admin" | "owner";

export interface UserSummary {
	id: number;
	name: string;
	email: string;
	role: UserRole;
	created_at?: string;
}

export interface AuthResponse {
	token: string;
	user: UserSummary;
}

export interface Game {
	id: number;
	title: string;
	genre?: string | null;
	platform?: string | null;
	release_year?: number | null;
	description?: string | null;
	cover_url?: string | null;
	avg_rating?: number | null;
	review_count?: number | null;
}

export interface Review {
  id: number;
  game_id: number;
  user_id: number;
  rating: number | null;
  title?: string | null;
  body?: string | null;
  created_at?: string;
  user_name?: string | null;
  user_role?: UserRole | null;
}
