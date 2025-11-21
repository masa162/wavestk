/**
 * wavestk Error Handling Utilities
 */

import type { Context } from 'hono';
import type { ErrorResponse } from './types';

export function errorResponse(c: Context, message: string, status: number = 500): Response {
  return c.json<ErrorResponse>({ error: message }, status);
}

export function handleError(c: Context, error: unknown, defaultMessage: string = 'Internal Server Error'): Response {
  console.error('Error:', error);

  if (error instanceof Error) {
    return errorResponse(c, error.message, 500);
  }

  return errorResponse(c, defaultMessage, 500);
}
