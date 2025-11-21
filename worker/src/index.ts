/**
 * wavestk CDN Worker
 * Audio file delivery with HTTP Range Request support
 */

interface Env {
  R2_BUCKET: R2Bucket;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Health check endpoint
    if (url.pathname === '/healthz' || url.pathname === '/health') {
      return new Response('OK', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // Extract filename from pathname
    const filename = url.pathname.slice(1); // /abc123de.mp3 → abc123de.mp3

    // Validate filename format: 8 lowercase alphanumeric characters + extension
    const filenameRegex = /^[a-z0-9]{8}\.(mp3|m4a|aac|wav|ogg|opus|flac|webm)$/i;
    if (!filenameRegex.test(filename)) {
      return new Response('Invalid filename format', {
        status: 400,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    try {
      // Get object from R2 with Range Request support
      const object = await env.R2_BUCKET.get(filename, {
        range: request.headers,
      });

      if (!object) {
        return new Response('Audio file not found', {
          status: 404,
          headers: { 'Content-Type': 'text/plain' },
        });
      }

      // Prepare response headers
      const headers = new Headers();
      headers.set('Content-Type', object.httpMetadata?.contentType || 'audio/mpeg');
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      headers.set('Accept-Ranges', 'bytes');

      // CORS - allow be2nd.com domains
      const origin = request.headers.get('Origin');
      if (origin && (origin.includes('be2nd.com') || origin.includes('localhost'))) {
        headers.set('Access-Control-Allow-Origin', origin);
        headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        headers.set('Access-Control-Allow-Headers', 'Range');
      }

      // Handle OPTIONS preflight request
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers });
      }

      // Handle Range Request (206 Partial Content)
      if (object.range) {
        headers.set(
          'Content-Range',
          `bytes ${object.range.offset}-${object.range.end ? object.range.end - 1 : object.size - 1}/${object.size}`
        );
        headers.set('Content-Length', String(object.range.length || object.size));
        return new Response(object.body, { status: 206, headers });
      }

      // ETag support for caching
      if (object.httpEtag) {
        headers.set('ETag', object.httpEtag);

        // Check If-None-Match header
        const ifNoneMatch = request.headers.get('If-None-Match');
        if (ifNoneMatch === object.httpEtag) {
          return new Response(null, { status: 304, headers });
        }
      }

      // Set Content-Length for full response
      headers.set('Content-Length', String(object.size));

      // Return full audio file
      return new Response(object.body, { status: 200, headers });

    } catch (error) {
      console.error('R2 error:', error);
      return new Response('Internal Server Error', {
        status: 500,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
  },
};
