import type { Handler } from '@netlify/functions';
import { atualizarCacheSeNecessario } from './_shared/dashboardCache.js';

/**
 * Alvo do Vercel Cron (ver "crons" em vercel.json) — chamada automaticamente pela plataforma,
 * não pelo frontend. É a ÚNICA rota que efetivamente consulta o Postgres (via
 * `dashboardCache.ts`, pool `max: 1`); todas as outras rotas do dashboard só leem o cache que
 * essa function mantém atualizado.
 *
 * O Vercel Cron aciona no mínimo 1x/min (não dá pra agendar mais frequente que isso na
 * plataforma) — `atualizarCacheSeNecessario` decide se already é cedo demais pra bater no banco
 * de novo, com base em `DASHBOARD_CACHE_INTERVALO_MS`, então o intervalo real de atualização
 * continua configurável por variável de ambiente mesmo com esse piso de 1 minuto.
 */
export const handler: Handler = async (event) => {
  // Vercel Cron manda `Authorization: Bearer $CRON_SECRET` quando essa env var está configurada
  // no projeto — protege a rota de ser disparada por qualquer um de fora (o que forçaria
  // atualizações fora de hora e voltaria a estressar o limite de conexões do banco).
  const segredo = process.env.CRON_SECRET;
  if (segredo) {
    const auth = event.headers.authorization ?? (event.headers as Record<string, string | undefined>).Authorization;
    if (auth !== `Bearer ${segredo}`) {
      return { statusCode: 401, body: JSON.stringify({ ok: false, error: 'Não autorizado.' }) };
    }
  }

  await atualizarCacheSeNecessario();
  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
