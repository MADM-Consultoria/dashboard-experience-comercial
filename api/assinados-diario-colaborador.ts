import { wrap } from './_adapter.js';
import { handler } from '../netlify/functions/assinados-diario-colaborador.js';

export default wrap(handler);
