/** The site's public address. On Vercel the production domain is provided automatically;
 *  set NEXT_PUBLIC_SITE_URL to override it (for a custom domain, say). */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000')
).replace(/\/$/, '');
