import { wrap } from './_adapter.js';
import { handler } from '../netlify/functions/auth-login.js';

export default wrap(handler);
