import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import UserModel, { User } from "../models/User";
import { AppError } from "../utils/AppError";
import { signAccessToken } from "../utils/token";
import { revokeToken } from "../utils/tokenBlacklist";
import { getFirebaseAuth } from "../config/firebaseAdmin";

// Remove campos sensíveis do utilizador
const sanitizeUser = (user: User) => ({
	id: user.id,
	name: user.name,
	email: user.email,
	role: user.role,
});

// Garante que o campo é string e aparado
const readStringField = (value: unknown): string =>
	typeof value === "string" ? value.trim() : "";

// Cria payload de autenticação e JWT
const buildAuthPayload = (user: User) => {
	if (!user.id) {
		throw new AppError("Utilizador invalido", 500);
	}

	const token = signAccessToken({
		sub: user.id,
		email: user.email,
		name: user.name,
		role: user.role,
	});

	return { token, user: sanitizeUser(user) };
};

const authController = {
	// Login via Firebase ID token (email/password criado no Firebase)
	async loginWithFirebase(req: Request, res: Response): Promise<void> {
		const idToken = readStringField(req.body.idToken);
		const displayName = readStringField(req.body.displayName);

		if (!idToken) {
			throw new AppError("Firebase ID token em falta", 400);
		}

		try {
			const firebaseAuth = getFirebaseAuth();
			const decoded = await firebaseAuth.verifyIdToken(idToken);
			const email = decoded.email?.toLowerCase();
			const nameFromToken = decoded.name || displayName || email?.split("@")[0] || "Player";

			if (!email) {
				throw new AppError("O token do Firebase nao tem email", 400);
			}

			if (!decoded.email_verified) {
				throw new AppError("Email nao verificado. Confirme o email antes de continuar.", 403);
			}

			let user = await UserModel.findByEmail(email);
			const isNewUser = !user;

			if (!user) {
				// Guarda um hash derivado do UID apenas para cumprir a coluna; auth real fica no Firebase
				const password_hash = await bcrypt.hash(decoded.uid || email, 10);
				user = await UserModel.create({
					name: nameFromToken,
					email,
					password_hash,
					role: "user",
				});
			}

			const payload = buildAuthPayload(user);
			res.status(isNewUser ? 201 : 200).json(payload);
		} catch (error) {
			if (error instanceof AppError) throw error;
			throw new AppError("Falha ao validar token do Firebase", 401);
		}
	},

	// Registo de novo utilizador
	async register(req: Request, res: Response): Promise<void> {
		const rawName = readStringField(req.body.name);
		const rawNickname = readStringField(req.body.nickname);
		const normalizedName = rawName || rawNickname;
		const normalizedEmail = readStringField(req.body.email).toLowerCase();
		const password = readStringField(req.body.password);

		if (!normalizedName || !normalizedEmail || !password) {
			throw new AppError(
				"Nome ou nickname, email e palavra-passe sao obrigatorios",
				400
			);
		}

		const existing = await UserModel.findByEmail(normalizedEmail);
		if (existing) {
			throw new AppError("Email ja registado", 409);
		}

		const password_hash = await bcrypt.hash(password, 10);
		const user = await UserModel.create({
			name: normalizedName,
			email: normalizedEmail,
			password_hash,
			role: "user",
		});

		res.status(201).json(buildAuthPayload(user));
	},

	// Login por email ou nickname
	async login(req: Request, res: Response): Promise<void> {
		const identifier =
			readStringField(req.body.identifier) || readStringField(req.body.email);
		const password = readStringField(req.body.password);

		if (!identifier || !password) {
			throw new AppError(
				"Nickname/email e palavra-passe sao obrigatorios",
				400
			);
		}

		const isEmail = identifier.includes("@");
		const lookupValue = isEmail ? identifier.toLowerCase() : identifier;
		const user = isEmail
			? await UserModel.findByEmail(lookupValue)
			: await UserModel.findByName(lookupValue);

		if (!user?.password_hash) {
			throw new AppError("Credenciais invalidas", 401);
		}

		const isValid = await bcrypt.compare(password, user.password_hash);
		if (!isValid) {
			throw new AppError("Credenciais invalidas", 401);
		}

		res.status(200).json(buildAuthPayload(user));
	},

	// Logout revogando o token atual
	async logout(req: Request, res: Response): Promise<void> {
		if (!req.user || !req.accessToken) {
			throw new AppError("Autenticacao obrigatoria", 401);
		}

		revokeToken(req.accessToken);
		res.status(204).send();
	},
};

export default authController;
