import { wrap } from './_adapter.js';
import { handler } from '../netlify/functions/venda-ganha-diario-colaborador.js';

export default wrap(handler);
