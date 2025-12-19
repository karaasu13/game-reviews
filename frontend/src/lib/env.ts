// URLs base para chamadas de API e assets
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";

const ASSETS_BASE_URL =
	import.meta.env.VITE_ASSETS_BASE_URL ?? API_URL.replace(/\/api\/?$/, "");

// Constrói URL absoluta para um asset (aceita http ou caminho relativo)
export const buildAssetUrl = (relativePath?: string | null): string | null => {
	if (!relativePath) {
		return null;
	}

	if (/^https?:\/\//i.test(relativePath)) {
		return relativePath;
	}

	const normalizedBase = ASSETS_BASE_URL.replace(/\/$/, "");
	const sanitizedPath = relativePath.replace(/^\//, "");
	const withPrefix = sanitizedPath.startsWith("assets/")
		? sanitizedPath
		: `assets/${sanitizedPath}`;
	return `${normalizedBase}/${withPrefix}`;
};

export { API_URL, ASSETS_BASE_URL };
