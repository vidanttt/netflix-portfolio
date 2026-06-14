import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { dbConnect, ContinueWatching } from '@/lib/mongodb';

// GET /api/bored/watch-history — Get continue-watching history for logged-in user
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const items = await ContinueWatching.find({ userId }).sort({ timestamp: -1 });
    return NextResponse.json({ results: items });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/bored/watch-history — Save or update a progress state
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      tmdbId,
      title,
      poster,
      backdrop,
      mediaType,
      progress,
      duration,
      season,
      episode,
      episodeTitle,
    } = body;

    if (!tmdbId || !title || !mediaType || progress === undefined || duration === undefined) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    await dbConnect();

    const item = await ContinueWatching.findOneAndUpdate(
      { userId, tmdbId, mediaType },
      {
        userId,
        tmdbId,
        title,
        poster: poster || '',
        backdrop,
        mediaType,
        progress,
        duration,
        season,
        episode,
        episodeTitle,
        timestamp: Date.now(),
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, result: item });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/bored/watch-history — Delete a progress item from history
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
    await ContinueWatching.deleteOne({ userId, tmdbId: Number(tmdbId), mediaType });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
