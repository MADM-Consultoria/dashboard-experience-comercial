import { wrap } from './_adapter.js';
import { handler } from '../netlify/functions/relatorio-judit.js';

export default wrap(handler);
