import pool, { query } from "./config/db";

// Teste rápido para validar conectividade e leitura da tabela users
type UserRow = Record<string, unknown>;

const runUsersSmokeTest = async (): Promise<void> => {
	try {
		const result = await query<UserRow>("SELECT * FROM users LIMIT 5");
		if (result.rowCount === 0) {
			console.log("A consulta não retornou usuários.");
			return;
		}

		console.log(`Encontrados ${result.rowCount} registro(s) na tabela users:`);
		console.table(result.rows);
	} catch (error) {
		console.error("Erro ao buscar usuários:", error);
		process.exitCode = 1;
	} finally {
		await pool.end();
	}
};

runUsersSmokeTest();
