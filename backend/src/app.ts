import express, { Request, Response } from "express";
import path from "path";
import cors from "cors";
import authRoutes from "./routes/authRoutes";
import usersRoutes from "./routes/usersRoutes";
import gamesRoutes from "./routes/gamesRoutes";
import reviewsRoutes from "./routes/reviewsRoutes";
import wishlistRoutes from "./routes/wishlistRoutes";
import uploadRoutes from "./routes/uploadRoutes";
import errorHandler, { notFound } from "./middleware/errorHandler";

const app = express();

// Middlewares globais
app.use(cors());
app.use(express.json());

// Servir assets estáticos (capas, etc.)
const assetsDir = path.resolve(__dirname, "../public");
app.use("/assets", express.static(assetsDir));

// Logger simples para depuração
app.use((req, _res, next) => {
	console.log(`${req.method} ${req.originalUrl}`);
	next();
});

// Endpoint de healthcheck
app.get("/health", (_req: Request, res: Response) => {
	res.status(200).json({ status: "ok" });
});

// Rotas da API
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/games", gamesRoutes);
app.use("/api/reviews", reviewsRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/uploads", uploadRoutes);

// Handlers finais
app.use(notFound);
app.use(errorHandler);

export default app;
