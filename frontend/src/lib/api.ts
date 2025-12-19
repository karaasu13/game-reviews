import { API_URL } from "./env";
import type { AuthResponse, Game, Review } from "../types";

export interface ApiRequestOptions {
	method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
	body?: unknown;
	token?: string;
	signal?: AbortSignal;
	headers?: Record<string, string>;
}

// Cliente fetch reutilizavel com suporte a token e JSON/FormData
export async function apiRequest<T>(
	endpoint: string,
	options: ApiRequestOptions = {}
): Promise<T> {
	const { method = "GET", body, token, signal, headers } = options;

	const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

	const finalHeaders: HeadersInit = {
		Accept: "application/json",
		...(body !== undefined && !isFormData ? { "Content-Type": "application/json" } : {}),
		...headers,
	};

	if (token) {
		finalHeaders.Authorization = `Bearer ${token}`;
	}

	let response: Response;
	try {
		response = await fetch(`${API_URL}${endpoint}`, {
			method,
			headers: finalHeaders,
			body: body !== undefined ? (isFormData ? body : JSON.stringify(body)) : undefined,
			signal,
		});
	} catch (err) {
		const reason = err instanceof Error ? err.message : "Network request failed";
		throw new Error(`Failed to reach API (${reason}). Check VITE_API_URL and backend status.`);
	}

	if (!response.ok) {
		const payload = await response.json().catch(() => null);
		const message =
			payload?.error ||
			payload?.message ||
			`Request failed with status ${response.status}`;
		throw new Error(message);
	}

	if (response.status === 204) {
		return undefined as T;
	}

	return (await response.json()) as T;
}

interface RegisterPayload {
	name: string;
	email: string;
	password: string;
	nickname?: string;
}

interface LoginPayload {
	identifier: string;
	password: string;
}

export const registerUser = (payload: RegisterPayload) =>
	apiRequest<AuthResponse>("/auth/register", {
		method: "POST",
		body: payload,
	});

export const loginUser = (payload: LoginPayload) =>
	apiRequest<AuthResponse>("/auth/login", {
		method: "POST",
		body: payload,
	});

export const exchangeFirebaseToken = (idToken: string, displayName?: string) =>
	apiRequest<AuthResponse>("/auth/firebase", {
		method: "POST",
		body: { idToken, displayName },
	});

export const logoutUser = (token: string) =>
	apiRequest<void>("/auth/logout", {
		method: "POST",
		token,
	});

export const fetchWishlist = (token: string) =>
	apiRequest<Game[]>("/wishlist", {
		method: "GET",
		token,
	});

export const addToWishlist = (gameId: number, token: string) =>
	apiRequest<Game>("/wishlist", {
		method: "POST",
		token,
		body: { gameId },
	});

export const removeFromWishlist = (gameId: number, token: string) =>
	apiRequest<void>(`/wishlist/${gameId}`, {
		method: "DELETE",
		token,
	});

export interface CreateGamePayload {
	title: string;
	genre?: string;
	platform?: string;
	release_year?: number;
	description?: string;
	cover_url?: string;
}

export const uploadCover = (file: File, token: string, title?: string) => {
	const formData = new FormData();
	formData.append("cover", file);
	if (title?.trim()) {
		formData.append("title", title.trim());
	}
	return apiRequest<{ url: string }>("/uploads/cover", {
		method: "POST",
		token,
		body: formData,
	});
};

export const fetchGameById = (gameId: number) =>
	apiRequest<Game>(`/games/${gameId}`);

export const createGame = (payload: CreateGamePayload, token: string) =>
	apiRequest<Game>("/games", {
		method: "POST",
		token,
		body: payload,
	});

export const deleteGame = (gameId: number, token: string) =>
	apiRequest<void>(`/games/${gameId}`, {
		method: "DELETE",
		token,
	});

export const fetchReviewsByGame = (gameId: number) =>
	apiRequest<Review[]>(`/reviews/game/${gameId}`);

export const submitReview = (
	gameId: number,
	rating: number | null | undefined,
	token: string,
	body?: { title?: string; body?: string }
) =>
	apiRequest<Review>("/reviews", {
		method: "POST",
		token,
		body: {
			gameId,
			rating: rating ?? null,
			title: body?.title ?? null,
			body: body?.body ?? null,
		},
	});

export const deleteReview = (reviewId: number, token: string) =>
	apiRequest<void>(`/reviews/${reviewId}`, {
		method: "DELETE",
		token,
	});

export const clearReviewRating = (reviewId: number, token: string) =>
	apiRequest<Review>(`/reviews/${reviewId}/rating`, {
		method: "PATCH",
		token,
	});

export const clearReviewComment = (reviewId: number, token: string) =>
	apiRequest<Review>(`/reviews/${reviewId}/comment`, {
		method: "PATCH",
		token,
	});
