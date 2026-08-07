import { wrap } from './_adapter.js';
import { handler } from '../netlify/functions/cache-status.js';

export default wrap(handler);
