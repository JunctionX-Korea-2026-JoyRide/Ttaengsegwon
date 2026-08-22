import { http, HttpResponse } from 'msw';

export const dummyHandlers = [
  http.get('/api/dummy', () => {
    return HttpResponse.json({ message: 'dummy response' });
  }),
];
