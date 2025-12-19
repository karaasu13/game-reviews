# Game Reviews Frontend

Interface em React + Vite + TypeScript que consome o backend Express disponivel em `http://localhost:3000/api`. A aplicacao oferece autenticacao basica, listagem de jogos, reviews e integracao com wishlist.

## Requisitos

- Node.js 18+
- Backend `game-reviews` a correr em `http://localhost:3000`

## Configuracao

Copie o ficheiro `.env.example` para `.env` e ajuste URLs caso necessario:

```bash
cp .env.example .env
# edite VITE_API_URL e VITE_ASSETS_BASE_URL se o backend estiver noutro host/porto
```

Variaveis suportadas:

- `VITE_API_URL` - endpoint base da API (default `http://localhost:3000/api`)
- `VITE_ASSETS_BASE_URL` - base para carregar `cover_url` quando usa caminhos relativos (default: deriva de `VITE_API_URL`)

  ## Scripts úteis

  - `npm run dev` – arranca o servidor de desenvolvimento do Vite
  - `npm run build` – compila o projeto (TypeScript + bundle)
  - `npm run preview` – serve o bundle produzido em `dist`
  - `npm run lint` – executa o ESLint

  ## Fluxos implementados

  - **Autenticação** – formulário de login que armazena o JWT e mostra o perfil atual (`/api/auth/login`, `/api/users/me`)
  - **Jogos** – grelha com capa, descrição e métricas (`/api/games`)
  - **Reviews** – lista por jogo selecionado (`/api/reviews/game/:gameId`)
  - **Wishlist** – botão para adicionar o jogo ativo (requer sessão, usa `/api/wishlist`)

  Os estados são guardados em `localStorage` para manter a sessão entre refreshes. Todos os pedidos usam `src/lib/api.ts`, que injecta automaticamente o token JWT quando presente.

  ## Estrutura principal

  - `src/App.tsx` – layout do dashboard e lógica de estado
  - `src/lib/api.ts` – helper para chamadas `fetch`
  - `src/lib/env.ts` – resolução de variáveis de ambiente e URLs de assets
  - `src/types.ts` – tipagens partilhadas com o backend

  ## Próximos passos sugeridos

  - Adicionar formulários para criar reviews diretamente pelo frontend
  - Mostrar a lista atual da wishlist e permitir remoção
  - Evoluir para routing (React Router) caso sejam necessárias múltiplas páginas

  ## Desenvolvimento

  1. Instale dependências: `npm install`
  2. Configure `.env`
  3. Inicie o backend (`npm run dev` no diretório `backend`)
  4. Execute `npm run dev` neste diretório e abra `http://localhost:5173`
