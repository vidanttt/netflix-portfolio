import { NextRequest, NextResponse } from 'next/server';

interface ChannelInfo {
  name: string;
  avatar: string;
  channelUrl: string;
}

// Warm in-memory cache (per server instance) so repeat requests don't hit YouTube again
const memory = new Map<string, { at: number; data: ChannelInfo }>();
const TTL = 24 * 60 * 60 * 1000;

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  // Skip the EU cookie-consent interstitial, which has no channel metadata
  Cookie: 'CONSENT=YES+cb; SOCS=CAI',
};

/** Read a <meta property="..." content="..."> regardless of attribute order. */
function meta(html: string, prop: string): string {
  const tag = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*>`, 'i'))?.[0];
  if (!tag) return '';
  return tag.match(/content=["']([^"']*)["']/i)?.[1] ?? '';
}

const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"');

async function scrape(url: string): Promise<ChannelInfo | null> {
  const res = await fetch(url, { headers: HEADERS, redirect: 'follow', cache: 'no-store' });
  if (!res.ok) return null;
  const html = await res.text();

  let avatar = decode(meta(html, 'og:image'));
  if (!avatar) {
    avatar =
      html.match(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i)?.[1] ??
      html.match(/"avatar":\{"thumbnails":\[\{"url":"([^"]+)"/)?.[1] ??
      '';
    avatar = decode(avatar);
  }
  if (!avatar) return null;

  // Ask Google's image host for a sharper square crop than the default thumbnail
  avatar = avatar.replace(/=s\d+(-[^=?]*)?$/, '=s800-c-k-c0x00ffffff-no-rj');

  return {
    name: decode(meta(html, 'og:title')) || 'Unknown Channel',
    avatar,
    channelUrl: decode(meta(html, 'og:url')) || url,
  };
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Missing url param' }, { status: 400 });
  }
  // Only ever fetch YouTube channel pages
  let host = '';
  try {
    host = new URL(url).hostname;
  } catch {
    return NextResponse.json({ error: 'Bad url' }, { status: 400 });
  }
  if (!/(^|\.)youtube\.com$/.test(host)) {
    return NextResponse.json({ error: 'Only youtube.com urls are allowed' }, { status: 400 });
  }

  const hit = memory.get(url);
  if (hit && Date.now() - hit.at < TTL) {
    return NextResponse.json(hit.data, { headers: { 'Cache-Control': 'public, max-age=3600' } });
  }

  // YouTube intermittently serves a stripped page; retry a couple of times
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const data = await scrape(url);
      if (data) {
        memory.set(url, { at: Date.now(), data });
        return NextResponse.json(data, { headers: { 'Cache-Control': 'public, max-age=3600' } });
      }
    } catch (err) {
      console.error('YouTube channel fetch error:', err);
    }
    await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
  }

  // Not cached on purpose: the client retries
  return NextResponse.json({ error: 'Could not read channel avatar' }, { status: 502 });
}
