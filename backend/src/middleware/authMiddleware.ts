import { NextFunction, Request, Response } from "express";
import { UserRole } from "../models/User";
import { AppError } from "../utils/AppError";
import { verifyAccessToken } from "../utils/token";
import { isTokenRevoked } from "../utils/tokenBlacklist";

// Valida o bearer token, recusa tokens revogados e anexa o utilizador ao pedido
export const authenticate = (
	req: Request,
	_res: Response,
	next: NextFunction
): void => {
	const header = req.headers.authorization;
	if (!header || !header.startsWith("Bearer ")) {
		throw new AppError("Missing bearer token", 401);
	}

	const token = header.replace("Bearer ", "");

	try {
		if (isTokenRevoked(token)) {
			throw new AppError("Session ended. Please sign in again.", 401);
		}

		const payload = verifyAccessToken(token);
		req.user = {
			id: payload.sub,
			email: payload.email,
			name: payload.name,
			role: payload.role,
		};
		req.accessToken = token;
		next();
	} catch (error) {
		if (error instanceof AppError) {
			throw error;
		}
		throw new AppError("Invalid or expired token", 401);
	}
};

// Restringe rotas a um conjunto de perfis
export const requireRole = (allowedRoles: UserRole[]) =>
	(req: Request, _res: Response, next: NextFunction): void => {
		if (!req.user) {
			throw new AppError("Authentication required", 401);
		}

		if (!allowedRoles.includes(req.user.role)) {
			throw new AppError("Insufficient permission", 403);
		}

		next();
	};
