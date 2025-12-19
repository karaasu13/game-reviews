import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import { UserRole } from "../models/User";
import { AppError } from "./AppError";

export interface TokenPayload {
  sub: number;
  email: string;
  name: string;
  role: UserRole;
}

// Lê o segredo JWT do ambiente e falha cedo se estiver ausente
const getSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AppError("JWT_SECRET is not configured", 500);
  }
  return secret;
};

// Assina um token de acesso de curta duração para o utilizador autenticado
export const signAccessToken = (payload: TokenPayload): string => {
  const expiresIn = (process.env.JWT_EXPIRES_IN || "12h") as SignOptions["expiresIn"];
  const options: SignOptions = { expiresIn };
  return jwt.sign(payload, getSecret(), options);
};

// Valida e interpreta um token de acesso recebido
export const verifyAccessToken = (token: string): TokenPayload => {
  const decoded = jwt.verify(token, getSecret());

  if (typeof decoded === "string" || decoded === null || typeof decoded !== "object") {
    throw new AppError("Invalid token", 401);
  }

  const payload = decoded as JwtPayload;

  if (
    typeof payload.sub === "undefined" ||
    typeof payload.email === "undefined" ||
    typeof payload.name === "undefined" ||
    typeof payload.role === "undefined"
  ) {
    throw new AppError("Incomplete token payload", 401);
  }

  return {
    sub: Number(payload.sub),
    email: String(payload.email),
    name: String(payload.name),
    role: payload.role as UserRole,
  };
};
