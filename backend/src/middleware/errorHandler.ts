import { NextFunction, Request, Response } from "express";
import { AppError, isAppError } from "../utils/AppError";

// Handler central de erros que normaliza AppError e falhas inesperadas
const errorHandler = (
	err: Error,
	_req: Request,
	res: Response,
	_next: NextFunction
): void => {
	const statusCode = isAppError(err) ? err.statusCode : 500;
	const message = err.message || "Unexpected internal error";

	if (process.env.NODE_ENV !== "production") {
		console.error(err);
	}

	res.status(statusCode).json({
		error: message,
		details: isAppError(err) ? err.details : undefined,
	});
};

export const notFound = (_req: Request, _res: Response, next: NextFunction): void => {
	next(new AppError("Route not found", 404));
};

export default errorHandler;
