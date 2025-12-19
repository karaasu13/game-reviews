import path from "path";
import dotenv from "dotenv";
import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";

// Carrega variáveis sensíveis a partir do ficheiro neon.env
dotenv.config({ path: path.resolve(__dirname, "../../neon.env") });

// Garante que as credenciais obrigatórias estão presentes
const requiredEnvVars = ["PGHOST", "PGDATABASE", "PGUSER", "PGPASSWORD"];

requiredEnvVars.forEach((key) => {
	if (!process.env[key]) {
		throw new Error(`Missing required environment variable: ${key}`);
	}
});

// Cria o pool de ligações PostgreSQL
const pool = new Pool({
	host: process.env.PGHOST,
	database: process.env.PGDATABASE,
	user: process.env.PGUSER,
	password: process.env.PGPASSWORD,
	ssl:
		process.env.PGSSLMODE === "require"
			? { rejectUnauthorized: false }
			: undefined,
});

// Sai do processo se houver erro num cliente ocioso
pool.on("error", (error: Error) => {
	console.error("Unexpected error on idle PostgreSQL client", error);
	process.exit(1);
});

// Obtém um cliente dedicado
export const getClient = async (): Promise<PoolClient> => pool.connect();

// Executa consultas reutilizando o pool partilhado
export const query = async <T extends QueryResultRow = QueryResultRow>(
	text: string,
	params?: unknown[]
): Promise<QueryResult<T>> => pool.query<T>(text, params);

export default pool;
