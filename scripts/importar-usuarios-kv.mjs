// Script de migração única: importa o export do Netlify Blobs (dashboard-registered-users/usuarios)
// pro Vercel KV, sob a mesma chave "usuarios" que _shared/users.ts espera encontrar.
import { readFileSync } from 'node:fs';
import { kv } from '@vercel/kv';

const caminho = process.argv[2];
if (!caminho) {
  console.error('Uso: node scripts/importar-usuarios-kv.mjs <caminho-do-json-exportado>');
  process.exit(1);
}

const usuarios = JSON.parse(readFileSync(caminho, 'utf-8'));
console.log(`Importando ${usuarios.length} usuário(s)...`);

await kv.set('usuarios', usuarios);

const conferencia = await kv.get('usuarios');
console.log(`Confirmado: ${Array.isArray(conferencia) ? conferencia.length : 0} usuário(s) agora no KV.`);
