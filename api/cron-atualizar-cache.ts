import { wrap } from './_adapter.js';
import { handler } from '../netlify/functions/cron-atualizar-cache.js';

export default wrap(handler);
