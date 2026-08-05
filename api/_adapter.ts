import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { Handler } from '@netlify/functions';

/**
 * Adapta um handler no formato Netlify Functions (event/context → { statusCode, body })
 * pro formato Vercel Node Functions ((req, res)). Existe só pra migrar de host sem
 * reescrever as 14 functions em netlify/functions/ — a lógica de negócio (queries,
 * validação de token, etc.) continua exatamente igual, só a "casca" de entrada/saída muda.
 */
export function wrap(handler: Handler) {
  return async (req: VercelRequest, res: VercelResponse) => {
    const queryStringParameters: Record<string, string> = {};
    for (const [chave, valor] of Object.entries(req.query)) {
      if (typeof valor === 'string') queryStringParameters[chave] = valor;
      else if (Array.isArray(valor)) queryStringParameters[chave] = valor[0];
    }

    const headers: Record<string, string> = {};
    for (const [chave, valor] of Object.entries(req.headers)) {
      if (typeof valor === 'string') headers[chave] = valor;
      else if (Array.isArray(valor)) headers[chave] = valor.join(', ');
    }

    const event = {
      httpMethod: req.method ?? 'GET',
      headers,
      queryStringParameters,
      body: typeof req.body === 'string' ? req.body : req.body ? JSON.stringify(req.body) : null,
      isBase64Encoded: false,
      path: req.url ?? '',
    };

    const resultado = await handler(event as any, {} as any, undefined as any);
    if (!resultado) {
      res.status(500).json({ ok: false, error: 'Função não retornou resposta.' });
      return;
    }

    res.status(resultado.statusCode ?? 200);
    if (resultado.headers) {
      for (const [chave, valor] of Object.entries(resultado.headers)) {
        res.setHeader(chave, String(valor));
      }
    }
    res.send(resultado.body ?? '');
  };
}
