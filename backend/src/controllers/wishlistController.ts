import { Request, Response } from "express";
import WishlistModel from "../models/Wishlist";
import { AppError } from "../utils/AppError";
import { resolveGameMetadata } from "../services/coverService";
import type { Game } from "../models/Game";
import fs from "fs";
import path from "path";

// Caminho base para validar assets locais servidos em /assets
const ASSETS_DIR = path.resolve(__dirname, "../../public");

// Prefere um valor fornecido, caso contrário usa um fallback preenchido
const preferProvided = (primary?: string | null, fallback?: string | null): string | null => {
	const cleaned = typeof primary === "string" ? primary.trim() : primary;
	if (cleaned) return primary as string;
	if (typeof fallback === "string" && fallback.trim()) return fallback;
	return null;
};

// Confere se um caminho /assets/... existe localmente
const isValidLocalAsset = (url: string | null | undefined): boolean => {
	if (!url) return false;
	if (url.startsWith("/assets/")) {
		const relativePath = url.replace("/assets/", "");
		const fullPath = path.join(ASSETS_DIR, relativePath);
		return fs.existsSync(fullPath);
	}
	return true;
};

// Enriquecimento com metadata remota mantendo dados locais
const withRemoteMetadata = async <T extends Game>(game: T): Promise<T> => {
	const localCoverValid = isValidLocalAsset(game.cover_url);
	const effectiveLocalCover = localCoverValid ? game.cover_url : null;

	const metadata = await resolveGameMetadata(game.title, {
		coverUrl: preferProvided(effectiveLocalCover, null),
		description: preferProvided(game.description, null),
	});

	return {
		...game,
		cover_url: preferProvided(effectiveLocalCover, metadata.coverUrl),
		description: preferProvided(game.description, metadata.description),
	};
};

// Operações da wishlist do utilizador
const wishlistController = {
	// Lista wishlist do utilizador autenticado
	async getMine(req: Request, res: Response): Promise<void> {
		if (!req.user) {
			throw new AppError("Autenticacao obrigatoria", 401);
		}

		const games = await WishlistModel.getByUser(req.user.id);
		const withMetadata = await Promise.all(games.map((g) => withRemoteMetadata(g)));
		res.json(withMetadata);
	},

	// Adiciona um jogo à wishlist
	async add(req: Request, res: Response): Promise<void> {
		if (!req.user) {
			throw new AppError("Autenticacao obrigatoria", 401);
		}

		const { gameId } = req.body;
		const parsedId = Number(gameId);

		if (!parsedId || Number.isNaN(parsedId)) {
			throw new AppError("ID do jogo e obrigatorio", 400);
		}

		const game = await WishlistModel.add(req.user.id, parsedId);
		if (!game) {
			throw new AppError("Jogo nao encontrado", 404);
		}

		const withMetadata = await withRemoteMetadata(game);
		res.status(201).json(withMetadata);
	},

	// Remove um jogo da wishlist
	async remove(req: Request, res: Response): Promise<void> {
		if (!req.user) {
			throw new AppError("Autenticacao obrigatoria", 401);
		}

		const parsedId = Number(req.params.gameId);
		if (!parsedId || Number.isNaN(parsedId)) {
			throw new AppError("ID do jogo e obrigatorio", 400);
		}

		const removed = await WishlistModel.remove(req.user.id, parsedId);
		if (!removed) {
			throw new AppError("Jogo nao estava na lista", 404);
		}

		res.status(204).send();
	},
};

export default wishlistController;
