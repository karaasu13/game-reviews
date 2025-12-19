import { Request, Response } from "express";
import UserModel from "../models/User";
import { AppError } from "../utils/AppError";

// Remove campos sensíveis e devolve só o necessário
const sanitize = (user: Awaited<ReturnType<typeof UserModel.findById>>) =>
	user
		? {
				id: user.id,
				name: user.name,
				email: user.email,
				role: user.role,
				created_at: user.created_at,
			}
		: null;

// Operações relacionadas com utilizadores
const usersController = {
	// Devolve o utilizador autenticado
	async me(req: Request, res: Response): Promise<void> {
		if (!req.user) {
			throw new AppError("Autenticacao obrigatoria", 401);
		}

		const user = await UserModel.findById(req.user.id);
		if (!user) {
			throw new AppError("Utilizador nao encontrado", 404);
		}

		res.json(sanitize(user));
	},

	// Lê um utilizador específico (admins/owner)
	async getById(req: Request, res: Response): Promise<void> {
		const id = Number(req.params.id);
		if (Number.isNaN(id)) {
			throw new AppError("ID invalido", 400);
		}

		const user = await UserModel.findById(id);
		if (!user) {
			throw new AppError("Utilizador nao encontrado", 404);
		}

		res.json(sanitize(user));
	},
};

export default usersController;
