// Configuração de cache e thresholds de similaridade
const CACHE_TTL_MS = 1000 * 60 * 60 * 12; 
const CACHE_TTL_FAIL_MS = 1000 * 60 * 10;
const SIMILARITY_PRIMARY = 0.35;
const SIMILARITY_SECONDARY = 0.3;
const STEAM_SEARCH_ENDPOINT = "https://steamcommunity.com/actions/SearchApps/";
const STEAM_STORE_SEARCH_ENDPOINT =
	"https://store.steampowered.com/api/storesearch/";
const STEAM_DETAILS_ENDPOINT = "https://store.steampowered.com/api/appdetails";
const STEAM_HEADER_URL = "https://cdn.cloudflare.steamstatic.com/steam/apps";
const CHEAPSHARK_SEARCH_ENDPOINT = "https://www.cheapshark.com/api/1.0/games";
const DEFAULT_USER_AGENT =
	process.env.STEAM_USER_AGENT ?? "Mozilla/5.0 (GameReviewsBot/1.0)";
const DEFAULT_ACCEPT_LANGUAGE =
	process.env.STEAM_ACCEPT_LANGUAGE ?? "en-US,en;q=0.9";

interface SteamMetadata {
	appId: number | null;
	coverUrl: string | null;
	description: string | null;
	source?: "steam" | "fallback";
}

interface CacheEntry {
	value: SteamMetadata | null;
	expiresAt: number;
}

interface SteamSearchResult {
	appid: number;
	name: string;
}

interface SteamStoreSearchItem {
	id: number;
	type: string;
	name?: string;
	tiny_image?: string;
	header_image?: string;
	short_description?: string;
}

interface SteamStoreSearchResponse {
	total?: number;
	items?: SteamStoreSearchItem[];
}

interface SteamAppDetailsEnvelope {
	success: boolean;
	data?: {
		about_the_game?: string;
		header_image?: string;
		short_description?: string;
	};
}

interface CheapSharkSearchItem {
	gameID: string;
	steamAppID?: string | null;
	external: string;
	thumb: string;
}

// Caches em memória para evitar chamadas repetidas
const metadataCache = new Map<string, CacheEntry>();
const appDetailsCache = new Map<number, CacheEntry>();

const buildSteamCoverUrl = (appId: number | string): string =>
	`${STEAM_HEADER_URL}/${appId}/header.jpg`;

// Lê uma entrada da cache com expiração
const readCache = <K extends string | number>(
	map: Map<K, CacheEntry>,
	key: K
): SteamMetadata | null | undefined => {
	const entry = map.get(key);
	if (!entry) {
		return undefined;
	}

	if (entry.expiresAt < Date.now()) {
		map.delete(key);
		return undefined;
	}

	return entry.value;
};

// Escreve na cache com TTL customizável
const writeCache = <K extends string | number>(
	map: Map<K, CacheEntry>,
	key: K,
	value: SteamMetadata | null,
	ttl: number = CACHE_TTL_MS
): void => {
	map.set(key, {
		value,
		expiresAt: Date.now() + ttl,
	});
};

const logPrefix = "[steamMetadata]";

// Normaliza títulos para comparação
const normalizeTitle = (value: string): string => {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, " ")
		.replace(/\s+/g, " ")
		.replace(
			/\b(game of the year|goty|complete edition|definitive edition|ultimate edition|remastered|remaster|deluxe|gold|standard|edition)\b/g,
			""
		)
		.trim();
};

// Calcula interseção de tokens para medir similaridade
const similarityScore = (a: string, b: string): number => {
	const tokensA = new Set(normalizeTitle(a).split(" ").filter(Boolean));
	const tokensB = new Set(normalizeTitle(b).split(" ").filter(Boolean));
	if (tokensA.size === 0 || tokensB.size === 0) return 0;

	const intersection = [...tokensA].filter((t) => tokensB.has(t)).length;
	const union = new Set([...tokensA, ...tokensB]).size;
	return intersection / union;
};

// Decide se o resultado é plausível pelo score
const isPlausibleMatch = (query: string, candidate?: string | null): boolean => {
	if (!candidate) return false;
	const score = similarityScore(query, candidate);
	return score >= SIMILARITY_SECONDARY;
};

const defaultHeaders = {
	"User-Agent": DEFAULT_USER_AGENT,
	Accept: "application/json, text/plain;q=0.9",
	"Accept-Language": DEFAULT_ACCEPT_LANGUAGE,
	Referer: "https://store.steampowered.com/",
};

// Fetch helper com headers e tolerância a falhas
const fetchJson = async <T>(url: string | URL): Promise<T | null> => {
	try {
		const response = await fetch(url, { headers: defaultHeaders });
		if (!response.ok) {
			console.warn(
				`${logPrefix} Request failed (${response.status} ${response.statusText}) -> ${url.toString()}`
			);
			return null;
		}
		return (await response.json()) as T;
	} catch (error) {
		console.error(`${logPrefix} Request error for ${url.toString()}:`, error);
		return null;
	}
};

// Procura appId na pesquisa principal da Steam
const fetchSteamAppId = async (title: string): Promise<number | null> => {
	const encodedTitle = encodeURIComponent(title);
	const primaryResults = await fetchJson<SteamSearchResult[]>(
		`${STEAM_SEARCH_ENDPOINT}${encodedTitle}`
	);

	const rankedPrimary =
		primaryResults
			?.map((r) => ({
				id: r.appid,
				name: r.name,
				score: similarityScore(title, r.name),
			}))
			.sort((a, b) => b.score - a.score) ?? [];

	const bestPrimary = rankedPrimary[0];
	if (bestPrimary && bestPrimary.score >= SIMILARITY_PRIMARY) {
		return bestPrimary.id;
	}

	return null;
};

// Pesquisa na store Steam para obter cover/descrição
const fetchSteamStoreMetadata = async (title: string): Promise<SteamMetadata | null> => {
	const storeUrl = new URL(STEAM_STORE_SEARCH_ENDPOINT);
	storeUrl.searchParams.set("term", title);
	storeUrl.searchParams.set("cc", "us");
	storeUrl.searchParams.set("l", "english");

	const storeResults = await fetchJson<SteamStoreSearchResponse>(storeUrl);
	if (!storeResults?.items?.length) {
		return null;
	}

	const ranked = storeResults.items
		.map((item) => ({
			item,
			score: similarityScore(title, item.name ?? ""),
		}))
		.sort((a, b) => b.score - a.score);

	const bestStore = ranked.find((entry) => entry.score >= SIMILARITY_SECONDARY)?.item ?? ranked[0]?.item;
	if (!bestStore?.id) {
		return null;
	}

	const cover =
		bestStore.header_image ||
		bestStore.tiny_image ||
		buildSteamCoverUrl(bestStore.id);

	return {
		appId: bestStore.id,
		coverUrl: cover,
		description: bestStore.short_description ?? null,
		source: "steam",
	};
};

// Busca detalhes completos por appId
const fetchSteamDetails = async (appId: number): Promise<SteamMetadata | null> => {
	const cached = readCache(appDetailsCache, appId);
	if (cached !== undefined) {
		return cached ?? null;
	}

	const url = new URL(STEAM_DETAILS_ENDPOINT);
	url.searchParams.set("appids", String(appId));
	url.searchParams.set("l", "english");

	const payload = await fetchJson<Record<string, SteamAppDetailsEnvelope>>(url);
	if (!payload) {
		return null;
	}

	const entry = payload?.[appId];
	if (!entry?.success) {
		writeCache(appDetailsCache, appId, null, CACHE_TTL_FAIL_MS);
		return null;
	}

	const coverUrl = entry.data?.header_image ?? buildSteamCoverUrl(appId);
	const description = entry.data?.about_the_game ?? entry.data?.short_description ?? null;
	const value: SteamMetadata = { appId, coverUrl, description };
	writeCache(appDetailsCache, appId, value);
	return value;
};

// Orquestra a pesquisa principal combinando store e detalhes
const fetchSteamMetadata = async (title: string): Promise<SteamMetadata | null> => {
	const storeMetadata = await fetchSteamStoreMetadata(title);
	const appId = storeMetadata?.appId ?? (await fetchSteamAppId(title));
	if (!appId) {
		return storeMetadata ?? (await fetchCheapSharkMetadata(title));
	}

	const details = await fetchSteamDetails(appId);
	if (details) {
		// Prefer details (full metadata) over storeMetadata (search result)
		return mergeWithFallback(storeMetadata ?? null, details);
	}

	if (storeMetadata) {
		return storeMetadata;
	}

	const cheapShark = await fetchCheapSharkMetadata(title);
	if (cheapShark) {
		return cheapShark;
	}

	return null;
};

// Fallback usando CheapShark quando Steam falha
const fetchCheapSharkMetadata = async (title: string): Promise<SteamMetadata | null> => {
	const searchUrl = new URL(CHEAPSHARK_SEARCH_ENDPOINT);
	searchUrl.searchParams.set("title", title);
	searchUrl.searchParams.set("limit", "8");

	const results = await fetchJson<CheapSharkSearchItem[]>(searchUrl);
	if (!results?.length) {
		return null;
	}

	const ranked = results
		.map((item) => ({
			item,
			score: similarityScore(title, item.external),
		}))
		.sort((a, b) => b.score - a.score);

	const best = ranked.find((entry) => entry.score >= 0.45)?.item;
	if (!best) {
		return null;
	}

	const appId = best.steamAppID ? Number(best.steamAppID) : null;

	return {
		appId: Number.isNaN(appId as number) ? null : appId,
		coverUrl: best.thumb || null,
		description: null,
		source: "fallback",
	};
};

// Junta metadata preferindo valores locais/fallback
const mergeWithFallback = (
	metadata: SteamMetadata | null,
	fallback?: Partial<SteamMetadata>
): SteamMetadata => {
	return {
		appId: fallback?.appId ?? metadata?.appId ?? null,
		// Prefer provided fallback (local data) over fetched metadata
		coverUrl: fallback?.coverUrl ?? metadata?.coverUrl ?? null,
		description: fallback?.description ?? metadata?.description ?? null,
		source: metadata?.source ?? fallback?.source,
	};
};

// Resolve metadata final para um título com cache e fallback
export const resolveGameMetadata = async (
	title: string,
	fallback?: Partial<SteamMetadata>
): Promise<SteamMetadata> => {
	const normalizedTitle = title?.trim().toLowerCase();
	if (!normalizedTitle) {
		return mergeWithFallback(null, fallback);
	}

	const cached = readCache(metadataCache, normalizedTitle);
	if (cached !== undefined) {
		return mergeWithFallback(cached, fallback);
	}

	const metadata = await fetchSteamMetadata(title);
	writeCache(metadataCache, normalizedTitle, metadata, metadata ? CACHE_TTL_MS : CACHE_TTL_FAIL_MS);

	return mergeWithFallback(metadata, fallback);
};
