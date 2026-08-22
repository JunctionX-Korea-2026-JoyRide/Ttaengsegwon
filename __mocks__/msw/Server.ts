import { setupServer } from 'msw/node';
import handlers from './Handler';

export const server = setupServer(...handlers);

export default server;
