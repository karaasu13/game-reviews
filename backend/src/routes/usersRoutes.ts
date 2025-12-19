import { Router } from "express";
import usersController from "../controllers/usersController";
import asyncHandler from "../utils/asyncHandler";
import { authenticate, requireRole } from "../middleware/authMiddleware";

// Rotas para leitura de utilizadores
const router = Router();

router.get("/me", authenticate, asyncHandler(usersController.me));
router.get(
	"/:id",
	authenticate,
	requireRole(["admin", "owner"]),
	asyncHandler(usersController.getById)
);

export default router;
