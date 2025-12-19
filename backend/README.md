# Game Reviews API

API em Express + TypeScript responsavel por autenticacao, gestao de jogos, reviews e wishlist.

## Requisitos

- Node.js 18+
- Base de dados PostgreSQL configurada (credenciais em `neon.env` ou variaveis de ambiente)

Configure tambem:

```
PGHOST=<host>
PGDATABASE=<db>
PGUSER=<user>
PGPASSWORD=<password>
PGSSLMODE=require
JWT_SECRET=<chave forte>
JWT_EXPIRES_IN=12h # opcional
STEAM_USER_AGENT="Mozilla/5.0 (GameReviewsBot/1.0)" # opcional
```

## Scripts

```bash
npm install
npm run dev # desenvolvimento com ts-node-dev
npm run build # compila para dist/
npm start # executa versao compilada
```

## Endpoints principais

- `POST /api/auth/register` - cria utilizador e devolve token JWT.
- `POST /api/auth/login` - autentica utilizador existente.
- `GET /api/users/me` - dados do utilizador autenticado.
- `GET /api/games` - listagem de jogos, alem de `/top`, `/random`, `/:id`.
- `POST /api/games` - regista jogo (admin/owner).
- `DELETE /api/games/:id` - remove jogo (admin/owner).
- `GET /api/reviews/game/:gameId` - avaliacoes de um jogo.
- `POST /api/reviews` - cria avaliacao autenticada.
- `DELETE /api/reviews/:id` - remove avaliacao propria ou via admin.
- `GET /api/wishlist` - wishlist do utilizador.
- `POST /api/wishlist` / `DELETE /api/wishlist/:gameId` - gere a wishlist.

Use o cabecalho `Authorization: Bearer <token>` nas rotas protegidas. O handler de erros centralizado devolve `{ "error": string }` e opcionalmente `details` quando aplicavel.

## Metadados atraves da Steam

Cada resposta de jogos consulta a [Steam Search API](https://steamcommunity.com/actions/SearchApps/) para descobrir o `appid` correspondente e depois chama `store.steampowered.com/api/appdetails`. Com isso, o backend devolve automaticamente:

- `cover_url` → `header_image` da Steam (ou `header.jpg` da CDN como fallback);
- `description` → campo `about_the_game` (HTML completo em PT) ou `short_description` caso o anterior nao exista.

Os resultados sao memorizados durante 12h para evitar chamadas repetidas. Se a Steam nao encontrar correspondencia, mantemos os valores previamente guardados na base de dados.

- Nao e precisa API key; recomenda-se apenas definir `STEAM_USER_AGENT` para identificar a aplicacao nos headers HTTP.
- Caso uses um proxy externo, ajusta as URLs em `coverService`.

```
STEAM_USER_AGENT="NomeDaAplicacao/1.0"
```

## Fallback para assets locais

Se algum jogo tiver `cover_url` absoluto/relativo previamente guardado, esse valor e usado quando a Steam nao encontrar correspondencia ou em caso de falha de rede. Continue a servir imagens de `backend/public/covers` atraves de `http://localhost:3000/assets/...` e mantenha `VITE_ASSETS_BASE_URL` a apontar para o backend para que `buildAssetUrl` gere o endereço correto.
