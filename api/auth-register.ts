import { wrap } from './_adapter.js';
import { handler } from '../netlify/functions/auth-register.js';

export default wrap(handler);
