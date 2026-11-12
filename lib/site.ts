/** The site's public address, used by robots.txt and sitemap.xml.
 *  Set NEXT_PUBLIC_SITE_URL to override it (a preview domain, say). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://vidant.tech').replace(/\/$/, '');
