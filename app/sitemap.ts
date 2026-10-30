import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now, priority: 1 },
    { url: `${SITE_URL}/creator`, lastModified: now, priority: 0.8 },
    { url: `${SITE_URL}/developer`, lastModified: now, priority: 0.8 },
  ];
}
