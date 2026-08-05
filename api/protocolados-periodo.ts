import { wrap } from './_adapter.js';
import { handler } from '../netlify/functions/protocolados-periodo.js';

export default wrap(handler);
