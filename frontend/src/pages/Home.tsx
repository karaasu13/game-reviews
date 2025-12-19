import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Home.module.css";
import { Header } from "../components/Header/Header";
import { GameCard } from "../components/GameCard/GameCard";
import { GameSearch } from "../components/GameSearch/GameSearch";
import { apiRequest } from "../lib/api";
import { buildAssetUrl } from "../lib/env";
import { ModalAuth, type AuthMode } from "../components/ModalAuth/ModalAuth";
import { ConfirmModal } from "../components/ConfirmModal/ConfirmModal";
import type { AuthResponse, Game } from "../types";
import { useAuth } from "../state/auth";
import { useWishlist } from "../state/wishlist";

const FEATURED_COUNT = 10;

// Pequeno hash determinístico para seed
const stringHash = (input: string): number => {
	let hash = 0;
	for (let i = 0; i < input.length; i += 1) {
		hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
	}
	return hash || 1;
};

// Gerador congruencial simples baseado na seed
const makeRng = (seedValue: number) => {
	let state = seedValue >>> 0;
	return () => {
		state = (1664525 * state + 1013904223) % 2 ** 32;
		return state / 2 ** 32;
	};
};

// Embaralha com seed e devolve apenas N itens
const seededShuffleTake = <T,>(items: T[], count: number, seed: string): T[] => {
	const pool = [...items];
	const rng = makeRng(stringHash(seed));
	for (let i = pool.length - 1; i > 0; i -= 1) {
		const j = Math.floor(rng() * (i + 1));
		[pool[i], pool[j]] = [pool[j], pool[i]];
	}
	return pool.slice(0, count);
};

export default function Home() {
	// Estado da homepage
	const [games, setGames] = useState<Game[]>([]);
	const [featured, setFeatured] = useState<Game[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [authMode, setAuthMode] = useState<AuthMode>("login");
	const [isAuthModalOpen, setAuthModalOpen] = useState(false);
	const [logoutOpen, setLogoutOpen] = useState(false);
	const navigate = useNavigate();
	const { user, setSession, logout } = useAuth();
	const { ids: wishlistIds, toggle: toggleWishlist, pending, error: wishlistError } = useWishlist();

	useEffect(() => {
		// Carrega catálogo e define destaques diários
		const load = async () => {
			setLoading(true);
			setError(null);
			try {
				const data = await apiRequest<Game[]>("/games");
				setGames(data);
				const seed = new Date().toISOString().slice(0, 10);
				setFeatured(seededShuffleTake(data, FEATURED_COUNT, seed));
			} catch (err) {
				const message = err instanceof Error ? err.message : "Error loading games";
				setError(message);
			} finally {
				setLoading(false);
			}
		};

		void load();
	}, []);

	// Normaliza dados para o componente de destaque
	const mappedFeatured = useMemo(
		() =>
			featured.map((g) => ({
				id: g.id,
				title: g.title,
				year: g.release_year,
				genre: g.genre,
				score: g.avg_rating,
				favorite: wishlistIds.has(g.id),
				cover: buildAssetUrl(g.cover_url),
				platforms: g.platform
					? g.platform.split(/[,+]/).map((p) => p.trim()).filter(Boolean)
					: [],
			})),
		[featured, wishlistIds]
	);

	// Adiciona/remove dos favoritos; pede login se necessário
	const handleToggleWishlist = async (gameId: number) => {
		if (!user) {
			openAuthModal("login");
			return;
		}

		try {
			await toggleWishlist(gameId);
		} catch (err) {
			const message = err instanceof Error ? err.message : "Error updating wishlist";
			setError(message);
		}
	};

	const openAuthModal = (mode: AuthMode = "login") => {
		setAuthMode(mode);
		setAuthModalOpen(true);
	};

	const handleAuthSuccess = (payload: AuthResponse) => {
		setSession(payload);
		setAuthModalOpen(false);
	};

	const handleSignOut = () => {
		setLogoutOpen(true);
	};

	const handleConfirmSignOut = async () => {
		setLogoutOpen(false);
		await logout();
	};

	const handleOpenGame = (gameId: number) => {
		navigate(`/games/${gameId}`);
	};

	const mergedError = error || wishlistError;

	return (
		<>
			<div className={styles.page}>
				<Header
					onAuthClick={() => openAuthModal("login")}
					user={user}
					onSignOut={handleSignOut}
				/>

			<main className={styles.main}>
				<section className={styles.hero}>
					<h1 className={styles.h1}>Games of the day</h1>
					<p className={styles.p}>Daily picks to start rating right away.</p>

					{loading && <div className={styles.loading}>Loading games...</div>}
					{mergedError && <div className={styles.error}>{mergedError}</div>}

					<div className={styles.todayScroller}>
						<div className={styles.todayRow}>
							{mappedFeatured.map((g) => (
								<GameCard
									key={g.id}
									game={g}
									onToggleFavorite={handleToggleWishlist}
									onClick={handleOpenGame}
								/>
							))}
						</div>
					</div>
				</section>

				<GameSearch
					catalog={games}
					wishlistIds={wishlistIds}
					onToggleWishlist={handleToggleWishlist}
					pendingIds={pending}
					onGameOpen={handleOpenGame}
				/>
			</main>
			</div>

			<ModalAuth
				open={isAuthModalOpen}
				defaultMode={authMode}
				onClose={() => setAuthModalOpen(false)}
				onSuccess={handleAuthSuccess}
			/>

			<ConfirmModal
				open={logoutOpen}
				title="Sign out"
				description="Are you sure you want to sign out?"
				confirmLabel="Confirm"
				cancelLabel="Cancel"
				onConfirm={handleConfirmSignOut}
				onCancel={() => setLogoutOpen(false)}
			/>
		</>
	);
}
