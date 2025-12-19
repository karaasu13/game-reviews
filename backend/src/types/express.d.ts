import { UserRole } from "../models/User";

declare global {
  namespace Express {
    interface AuthPayload {
      id: number;
      email: string;
      name: string;
      role: UserRole;
    }

    interface Request {
      user?: AuthPayload;
      accessToken?: string;
    }
  }
}

export {};
