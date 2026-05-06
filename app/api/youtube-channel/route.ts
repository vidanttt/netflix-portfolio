import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Missing url param' }, { status: 400 });
  }

  try {
    // Fetch the YouTube channel page HTML
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      next: { revalidate: 86400 }, // Cache for 24 hours
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch channel page: ${res.status}` },
        { status: 502 }
      );
    }

    const html = await res.text();

    // Extract profile picture from og:image meta tag
    const ogImageMatch = html.match(
      /<meta\s+property="og:image"\s+content="([^"]+)"/
    );
    const avatar = ogImageMatch?.[1] || '';

    // Extract channel name from og:title
    const ogTitleMatch = html.match(
      /<meta\s+property="og:title"\s+content="([^"]+)"/
    );
    const name = ogTitleMatch?.[1] || 'Unknown Channel';

    // Extract channel URL from og:url (canonical)
    const ogUrlMatch = html.match(
      /<meta\s+property="og:url"\s+content="([^"]+)"/
    );
    const channelUrl = ogUrlMatch?.[1] || url;

    return NextResponse.json({
      name,
      avatar,
      channelUrl,
    });
  } catch (err) {
    console.error('YouTube channel fetch error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch channel info' },
      { status: 500 }
    );
  }
}
