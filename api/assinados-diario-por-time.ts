import { wrap } from './_adapter.js';
import { handler } from '../netlify/functions/assinados-diario-por-time.js';

export default wrap(handler);
