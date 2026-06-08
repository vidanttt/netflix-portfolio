import { NextRequest, NextResponse } from 'next/server';

/* ════════════════════════════════════════════════════
   TMDB API PROXY ROUTE
   Uses Bearer token (read access token) for auth.
   Falls back to API key if token is missing.

   Usage:
     /api/tmdb?endpoint=trending/movie/week
     /api/tmdb?endpoint=search/movie&query=inception&page=2
     /api/tmdb?endpoint=movie/123&append_to_response=credits
     /api/tmdb?endpoint=discover/movie&with_genres=28&page=3
   ════════════════════════════════════════════════════ */

const TMDB_ACCESS_TOKEN = process.env.TMDB_ACCESS_TOKEN;
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = 'https://api.themoviedb.org/3';

export async function GET(req: NextRequest) {
  if (!TMDB_ACCESS_TOKEN && !TMDB_API_KEY) {
    return NextResponse.json(
      { error: 'TMDB credentials are not configured' },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const endpoint = searchParams.get('endpoint');

  if (!endpoint) {
    return NextResponse.json(
      { error: 'Missing "endpoint" query parameter' },
      { status: 400 }
    );
  }

  // Build the upstream TMDB URL
  const url = new URL(`${TMDB_BASE}/${endpoint}`);

  // If no Bearer token, fall back to api_key query param
  if (!TMDB_ACCESS_TOKEN) {
    url.searchParams.set('api_key', TMDB_API_KEY!);
  }

  // Forward all extra query params
  searchParams.forEach((value, key) => {
    if (key !== 'endpoint') {
      url.searchParams.set(key, value);
    }
  });

  try {
    const headers: HeadersInit = {
      accept: 'application/json',
    };

    // Prefer Bearer token auth
    if (TMDB_ACCESS_TOKEN) {
      headers['Authorization'] = `Bearer ${TMDB_ACCESS_TOKEN}`;
    }

    const res = await fetch(url.toString(), {
      headers,
      next: { revalidate: 300 }, // cache 5 min
    });

    if (!res.ok) {
      const body = await res.text();
      return NextResponse.json(
        { error: `TMDB responded with ${res.status}`, detail: body },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch from TMDB' },
      { status: 502 }
    );
  }
}
