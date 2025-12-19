import { Router } from "express";
import authController from "../controllers/authController";
import asyncHandler from "../utils/asyncHandler";
import { authenticate } from "../middleware/authMiddleware";

// Rotas de autenticação
const router = Router();

router.post("/register", asyncHandler(authController.register));
router.post("/login", asyncHandler(authController.login));
router.post("/firebase", asyncHandler(authController.loginWithFirebase));
router.post("/logout", authenticate, asyncHandler(authController.logout));

export default router;
