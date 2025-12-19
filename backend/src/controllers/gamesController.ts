import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import GameModel, { Game } from "../models/Game";
import { AppError } from "../utils/AppError";
import { resolveGameMetadata } from "../services/coverService";

// Caminho base para validar assets locais servidos em /assets
const ASSETS_DIR = path.resolve(__dirname, "../../public");

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

// Converte e valida ids vindos das rotas
const parseId = (value: string | undefined, entity = "jogo"): number => {
	const id = Number(value);
	if (!value || Number.isNaN(id)) {
		throw new AppError(`Identificador de ${entity} invalido`, 400);
	}
	return id;
};

// Prefere um valor fornecido, ou usa fallback não vazio
const preferProvided = (primary?: string | null, fallback?: string | null): string | null => {
	const cleaned = typeof primary === "string" ? primary.trim() : primary;
	if (cleaned) return primary as string;
	if (typeof fallback === "string" && fallback.trim()) return fallback;
	return null;
};

// Enriquecimento opcional com metadata remota (Steam) mantendo preferências locais
const withRemoteMetadata = async <T extends Game>(game: T): Promise<T> => {
	const localCoverValid = isValidLocalAsset(game.cover_url);
	const effectiveLocalCover = localCoverValid ? game.cover_url : null;

	const metadata = await resolveGameMetadata(game.title, {
		coverUrl: preferProvided(effectiveLocalCover, null),
		description: preferProvided(game.description, null),
	});
	return {
		...game,
		// Prefer provided fields (site-added games), but backfill missing values from Steam
		cover_url: preferProvided(effectiveLocalCover, metadata.coverUrl),
		description: preferProvided(game.description, metadata.description),
	};
};

// Versão em lote para listas de jogos
const withRemoteMetadataList = async <T extends Game>(games: T[]): Promise<T[]> =>
	Promise.all(games.map((game) => withRemoteMetadata(game)));

const gamesController = {
	// Lista todos os jogos
	async list(_req: Request, res: Response): Promise<void> {
		const games = await GameModel.findAll();
		res.json(await withRemoteMetadataList(games));
	},

	// Detalhe de um jogo por id
	async getById(req: Request, res: Response): Promise<void> {
		const id = parseId(req.params.id);
		const game = await GameModel.findById(id);
		if (!game) {
			throw new AppError("Jogo nao encontrado", 404);
		}
		res.json(await withRemoteMetadata(game));
	},

	// Top 10 por rating
	async top10(_req: Request, res: Response): Promise<void> {
		const games = await GameModel.findTop10ByRating();
		res.json(await withRemoteMetadataList(games));
	},

	// Jogo aleatório
	async random(_req: Request, res: Response): Promise<void> {
		const game = await GameModel.findRandom();
		if (!game) {
			throw new AppError("Ainda nao existem jogos registados", 404);
		}
		res.json(await withRemoteMetadata(game));
	},

	// Criação de novo jogo
	async create(req: Request, res: Response): Promise<void> {
		const { title, genre, platform, release_year, description, cover_url }: Game = req.body;

		if (!title) {
			throw new AppError("Titulo e obrigatorio", 400);
		}

		const game = await GameModel.create({
			title,
			genre: genre ?? null,
			platform: platform ?? null,
			release_year: release_year ?? null,
			description: description ?? null,
			cover_url: cover_url ?? null,
		});

		res.status(201).json(await withRemoteMetadata(game));
	},

	// Remoção de jogo por id
	async remove(req: Request, res: Response): Promise<void> {
		const id = parseId(req.params.id);
		const existing = await GameModel.findById(id);
		if (!existing) {
			throw new AppError("Jogo nao encontrado", 404);
		}
		await GameModel.remove(id);
		res.status(204).send();
	},
};

export default gamesController;
