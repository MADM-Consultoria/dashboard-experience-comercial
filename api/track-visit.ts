import { wrap } from './_adapter.js';
import { handler } from '../netlify/functions/track-visit.js';

export default wrap(handler);
