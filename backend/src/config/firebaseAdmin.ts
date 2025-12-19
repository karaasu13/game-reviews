import path from "path";
import dotenv from "dotenv";
import admin from "firebase-admin";

// Carrega variáveis do ficheiro neon.env (mesma origem do restante backend)
dotenv.config({ path: path.resolve(__dirname, "../../neon.env") });

let cachedAuth: admin.auth.Auth | null = null;

// Inicializa firebase-admin apenas quando necessário
export const getFirebaseAuth = (): admin.auth.Auth => {
	if (cachedAuth) return cachedAuth;

	const projectId = process.env.FIREBASE_PROJECT_ID;
	const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
	const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

	if (!projectId || !clientEmail || !privateKey) {
		throw new Error(
			"Missing Firebase Admin credentials. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY."
		);
	}

	if (!admin.apps.length) {
		admin.initializeApp({
			credential: admin.credential.cert({
				projectId,
				clientEmail,
				privateKey,
			}),
		});
	}

	cachedAuth = admin.auth();
	return cachedAuth;
};

export default admin;
