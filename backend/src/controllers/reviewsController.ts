import { Request, Response } from "express";
import ReviewModel from "../models/Review";
import GameModel from "../models/Game";
import { AppError } from "../utils/AppError";


// Operações relacionadas com avaliações
const reviewsController = {
	// Lista avaliações de um jogo específico
	async listByGame(req: Request, res: Response): Promise<void> {
		const gameId = Number(req.params.gameId);
		if (Number.isNaN(gameId)) {
			throw new AppError("ID do jogo invalido", 400);
		}

		const reviews = await ReviewModel.findByGame(gameId);
		res.json(reviews);
	},

	// Cria ou atualiza a avaliação do utilizador para um jogo
	async create(req: Request, res: Response): Promise<void> {
		if (!req.user) {
			throw new AppError("Autenticacao obrigatoria", 401);
		}

		const { gameId, rating, title, body } = req.body;

		if (!gameId || Number.isNaN(Number(gameId))) {
			throw new AppError("ID do jogo e obrigatorio", 400);
		}

		const parsedRating = rating === null || rating === undefined ? null : Number(rating);
		const hasRating = parsedRating !== null && Number.isFinite(parsedRating);
		// Permite notas com meia casa decimal entre 0.5 e 10
		if (hasRating) {
			const isValidRating = parsedRating! >= 0.5 && parsedRating! <= 10;
			if (!isValidRating) {
				throw new AppError("Avaliacao deve estar entre 0.5 e 10", 400);
			}
		}

		const exists = await GameModel.findById(Number(gameId));
		if (!exists) {
			throw new AppError("Jogo nao encontrado", 404);
		}

		const existingReview = await ReviewModel.findUserReview(Number(gameId), req.user.id);

		let review;
		if (existingReview) {
			review = await ReviewModel.updateUserReview(Number(gameId), req.user.id, {
				rating: hasRating ? (parsedRating as number) : undefined,
				title: title ?? undefined,
				body: body ?? undefined,
			});
		} else {
			review = await ReviewModel.create({
				game_id: Number(gameId),
				user_id: req.user.id,
				rating: hasRating ? (parsedRating as number) : null,
				title: title ?? null,
				body: body ?? null,
			});
		}

		res.status(201).json(review);
	},

	// Remove uma avaliação (se for do utilizador ou admin)
	async remove(req: Request, res: Response): Promise<void> {
		if (!req.user) {
			throw new AppError("Autenticacao obrigatoria", 401);
		}

		const id = Number(req.params.id);
		if (Number.isNaN(id)) {
			throw new AppError("ID da avaliacao invalido", 400);
		}

		const deleted = await ReviewModel.delete(id, req.user.id, req.user.role === "admin" || req.user.role === "owner");

		if (!deleted) {
			throw new AppError("Avaliacao nao encontrada ou sem permissao", 404);
		}

		res.status(204).send();
	},

	// Limpa apenas a nota de uma avaliação
	async clearRating(req: Request, res: Response): Promise<void> {
		if (!req.user) {
			throw new AppError("Autenticacao obrigatoria", 401);
		}

		const id = Number(req.params.id);
		if (Number.isNaN(id)) {
			throw new AppError("ID da avaliacao invalido", 400);
		}

		const updated = await ReviewModel.clearRating(id, req.user.id, req.user.role === "admin" || req.user.role === "owner");
		if (!updated) {
			throw new AppError("Avaliacao nao encontrada ou sem permissao", 404);
		}

		res.json(updated);
	},

	// Limpa apenas o comentário de uma avaliação
	async clearComment(req: Request, res: Response): Promise<void> {
		if (!req.user) {
			throw new AppError("Autenticacao obrigatoria", 401);
		}

		const id = Number(req.params.id);
		if (Number.isNaN(id)) {
			throw new AppError("ID da avaliacao invalido", 400);
		}

		const updated = await ReviewModel.clearComment(id, req.user.id, req.user.role === "admin" || req.user.role === "owner");
		if (!updated) {
			throw new AppError("Avaliacao nao encontrada ou sem permissao", 404);
		}

		res.json(updated);
	},
};

export default reviewsController;
