// Lista em memória para revogar tokens após logout
const revokedTokens = new Set<string>();

// Verifica se o token já foi revogado
export const isTokenRevoked = (token: string): boolean => revokedTokens.has(token);

// Regista um token como revogado
export const revokeToken = (token: string): void => {
  if (!token) return;
  revokedTokens.add(token);
};

// Remove um token da lista (para testes ou rollback)
export const clearToken = (token: string): void => {
  revokedTokens.delete(token);
};
