/**
 * Redirect Worker for wave.be2nd.com → wave.masa86.com
 *
 * This worker provides permanent (301) redirects from the old domain
 * to the new domain, maintaining URL paths and query strings.
 *
 * Deploy this to wave.be2nd.com to ensure existing links continue to work.
 */

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Preserve the path and query string
    const newUrl = `https://wave.masa86.com${url.pathname}${url.search}`;

    // Return 301 Permanent Redirect
    return Response.redirect(newUrl, 301);
  },
};
