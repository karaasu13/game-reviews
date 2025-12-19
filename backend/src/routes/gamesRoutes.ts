import { Router } from "express";
import gamesController from "../controllers/gamesController";
import asyncHandler from "../utils/asyncHandler";
import { authenticate, requireRole } from "../middleware/authMiddleware";

// Rotas de gestão e leitura de jogos
const router = Router();

router.get("/", asyncHandler(gamesController.list));
router.get("/top", asyncHandler(gamesController.top10));
router.get("/random", asyncHandler(gamesController.random));
router.get("/:id", asyncHandler(gamesController.getById));

router.post(
	"/",
	authenticate,
	requireRole(["admin", "owner"]),
	asyncHandler(gamesController.create)
);

router.delete(
	"/:id",
	authenticate,
	requireRole(["admin", "owner"]),
	asyncHandler(gamesController.remove)
);

export default router;
