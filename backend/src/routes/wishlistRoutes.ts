import { Router } from "express";
import wishlistController from "../controllers/wishlistController";
import asyncHandler from "../utils/asyncHandler";
import { authenticate } from "../middleware/authMiddleware";

// Rotas para gerir a wishlist do utilizador
const router = Router();

router.get("/", authenticate, asyncHandler(wishlistController.getMine));
router.post("/", authenticate, asyncHandler(wishlistController.add));
router.delete(
	"/:gameId",
	authenticate,
	asyncHandler(wishlistController.remove)
);

export default router;
