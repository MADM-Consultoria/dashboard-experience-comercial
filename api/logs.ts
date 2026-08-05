import { wrap } from './_adapter.js';
import { handler } from '../netlify/functions/logs.js';

export default wrap(handler);
