import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { dbConnect, Watchlist } from '@/lib/mongodb';

// GET /api/bored/watchlist — Retrieve watchlist for logged-in user
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const items = await Watchlist.find({ userId }).sort({ addedAt: -1 });
    return NextResponse.json({ results: items });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/bored/watchlist — Add an item to the watchlist
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { tmdbId, title, poster, backdrop, mediaType, rating, year, genres } = body;

    if (!tmdbId || !title || !poster || !mediaType) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    await dbConnect();

    // Use findOneAndUpdate with upsert to prevent unique constraint conflicts
    const item = await Watchlist.findOneAndUpdate(
      { userId, tmdbId, mediaType },
      {
        userId,
        tmdbId,
        title,
        poster,
        backdrop: backdrop || '',
        mediaType,
        rating: rating || 0,
        year: year || '',
        genres: genres || [],
        addedAt: Date.now(),
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, result: item });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/bored/watchlist — Remove an item from the watchlist
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const tmdbId = searchParams.get('tmdbId');
    const mediaType = searchParams.get('mediaType');

    if (!tmdbId || !mediaType) {
      return NextResponse.json({ error: 'Missing tmdbId or mediaType' }, { status: 400 });
    }

    await dbConnect();
    await Watchlist.deleteOne({ userId, tmdbId: Number(tmdbId), mediaType });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
