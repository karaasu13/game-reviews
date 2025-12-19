import path from "path";
import dotenv from "dotenv";
import app from "./app";

// Carrega variáveis de ambiente e arranca o servidor HTTP
dotenv.config({ path: path.resolve(__dirname, "../neon.env") });

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.listen(PORT, () => {
	// eslint-disable-next-line no-console
	console.log(`Server listening on http://localhost:${PORT}`);
});
