import { wrap } from './_adapter.js';
import { handler } from '../netlify/functions/recebidos-periodo.js';

export default wrap(handler);
