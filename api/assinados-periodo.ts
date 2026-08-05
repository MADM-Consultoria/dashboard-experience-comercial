import { wrap } from './_adapter.js';
import { handler } from '../netlify/functions/assinados-periodo.js';

export default wrap(handler);
