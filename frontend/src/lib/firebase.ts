import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

// Config pública do Firebase (pode ser movida para .env se preferir)
const firebaseConfig = {
	apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "AIzaSyAvYcyl8JdzWSvna0819kM_VpRm2EAe4a8",
	authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "gamereviews-3d413.firebaseapp.com",
	projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "gamereviews-3d413",
	storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "gamereviews-3d413.firebasestorage.app",
	messagingSenderId:
		import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "563300801286",
	appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "1:563300801286:web:2ade257a036f3075b71c87",
	measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ?? "G-5L98RNZ4XH",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(app);
