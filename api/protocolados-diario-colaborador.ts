import { wrap } from './_adapter.js';
import { handler } from '../netlify/functions/protocolados-diario-colaborador.js';

export default wrap(handler);
