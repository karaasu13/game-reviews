import { Router } from "express";
import reviewsController from "../controllers/reviewsController";
import asyncHandler from "../utils/asyncHandler";
import { authenticate } from "../middleware/authMiddleware";

// Rotas para avaliações por jogo
const router = Router();

router.get("/game/:gameId", asyncHandler(reviewsController.listByGame));
router.post("/", authenticate, asyncHandler(reviewsController.create));
router.delete("/:id", authenticate, asyncHandler(reviewsController.remove));
router.patch("/:id/rating", authenticate, asyncHandler(reviewsController.clearRating));
router.patch("/:id/comment", authenticate, asyncHandler(reviewsController.clearComment));

export default router;
