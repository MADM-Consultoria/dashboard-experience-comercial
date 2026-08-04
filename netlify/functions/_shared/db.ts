import { Pool } from 'pg';

let pool: Pool | null = null;

/**
 * Reaproveita a mesma conexão entre invocações "quentes" da function, em vez
 * de abrir uma conexão nova com o Postgres a cada request e fechar em
 * seguida — abrir/fechar conexão pesa mais no banco do que a query em si.
 * Nunca chamar `pool.end()` fora de um script standalone: aqui o pool
 * precisa sobreviver entre chamadas, o runtime da function é quem cuida do
 * ciclo de vida do processo.
 *
 * `max: 2` e `idleTimeoutMillis` curto — o usuário `svc_relatorio_supervisao`
 * tem um limite de conexões simultâneas no banco, e como cada uma das ~10
 * functions do Netlify mantém seu próprio pool, um `max` alto por function
 * multiplica rápido e estoura esse limite (já aconteceu). Prefere manter
 * poucas conexões por function e devolver mais rápido pro banco.
 */
export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
      database: process.env.DB_DATABASE,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false },
      max: 2,
      idleTimeoutMillis: 10000,
    });
  }
  return pool;
}
