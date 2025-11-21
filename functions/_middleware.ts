/**
 * wavestk Basic Authentication Middleware
 * Protects all pages and API endpoints
 */

import type { PagesFunction } from '@cloudflare/workers-types';
import type { Env } from './types';

const basicAuth: PagesFunction<Env> = async (context) => {
  const { request, env, next } = context;
  const url = new URL(request.url);

  // Get Authorization header
  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    const contentType = url.pathname.startsWith('/api/')
      ? 'application/json'
      : 'text/html';

    const body = url.pathname.startsWith('/api/')
      ? JSON.stringify({ error: 'Unauthorized' })
      : 'Unauthorized';

    return new Response(body, {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="wavestk Admin"',
        'Content-Type': contentType,
      },
    });
  }

  // Decode credentials
  try {
    const credentials = atob(authHeader.slice(6));
    const [username, password] = credentials.split(':');

    // Verify credentials
    if (username !== env.BASIC_AUTH_USER || password !== env.BASIC_AUTH_PASS) {
      return new Response('Unauthorized', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="wavestk Admin"',
        },
      });
    }

    // Authentication successful, proceed to next handler
    return next();

  } catch (error) {
    return new Response('Unauthorized', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="wavestk Admin"',
      },
    });
  }
};

export const onRequest = [basicAuth];
