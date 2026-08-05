import { wrap } from './_adapter.js';
import { handler } from '../netlify/functions/venda-ganha-periodo.js';

export default wrap(handler);
