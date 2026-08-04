/**
 * Validação de entrada compartilhada por todas as Netlify Functions que
 * recebem dado de fora (login, cadastro, rastreamento de página).
 *
 * Por que isso importa: as functions que acessam o Postgres real sempre usam
 * query parametrizada (nunca concatenação de string do usuário), e o React já
 * escapa tudo que renderiza (nenhum dangerouslySetInnerHTML no projeto) — então
 * não existe injeção de SQL nem XSS "clássico" para explorar hoje. Isso aqui é
 * a segunda camada: garantir que nenhuma function aceite payload fora do
 * formato esperado (tamanho, tipo, caracteres de controle), tanto pras queries
 * quanto para não deixar o armazenamento (Netlify Blobs) crescer com lixo/abuso.
 */

export class ValidacaoError extends Error {}

/** Garante que o valor é uma string, sem caracteres de controle, dentro do tamanho máximo. */
export function textoSeguro(valor: unknown, campo: string, maxLen: number): string {
  if (typeof valor !== 'string') {
    throw new ValidacaoError(`${campo} é obrigatório.`);
  }
  // eslint-disable-next-line no-control-regex
  const semControle = valor.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');
  const limpo = semControle.trim();
  if (limpo.length === 0) {
    throw new ValidacaoError(`${campo} é obrigatório.`);
  }
  if (limpo.length > maxLen) {
    throw new ValidacaoError(`${campo} excede o tamanho máximo permitido.`);
  }
  return limpo;
}

/** Caminho de rota do próprio app (ex: "/comercial") — nunca uma URL externa ou payload arbitrário. */
export function caminhoSeguro(valor: unknown): string {
  const texto = textoSeguro(valor, 'Caminho', 200);
  if (!/^\/[a-zA-Z0-9\-_/@.%]*$/.test(texto)) {
    throw new ValidacaoError('Caminho em formato inválido.');
  }
  return texto;
}

/**
 * Extrai um único IP do cabeçalho de conexão do Netlify. Alguns proxies
 * mandam uma lista separada por vírgula (ex: "1.2.3.4, 10.0.0.1") — sem
 * normalizar isso, duas pessoas atrás do mesmo proxy corporativo podem
 * parecer estar em IPs "diferentes" (ou o inverso: o filtro por IP no
 * /logs deixa de bater exatamente por causa de espaço/caixa diferente).
 */
export function extrairIp(valor: string | undefined): string | undefined {
  if (!valor) return undefined;
  const primeiro = valor.split(',')[0]?.trim();
  return primeiro || undefined;
}
