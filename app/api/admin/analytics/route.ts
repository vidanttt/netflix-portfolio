import { currentUser, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { dbConnect, Watchlist, ContinueWatching } from '@/lib/mongodb';

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin privileges
    const userEmails = user.emailAddresses.map((e) => e.emailAddress);
    const adminEmail = process.env.ADMIN_EMAIL;

    if (!adminEmail || !userEmails.includes(adminEmail)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    await dbConnect();

    // Fetch users list from Clerk
    const client = await clerkClient();
    const clerkUsersResponse = await client.users.getUserList({
      limit: 100,
      orderBy: '-created_at',
    });
    
    // Fallback if data is in a .data key or nested
    const clerkUsers = Array.isArray(clerkUsersResponse) 
      ? clerkUsersResponse 
      : (clerkUsersResponse as any).data || [];

    // Map database stats for each user
    const usersAnalytics = await Promise.all(
      clerkUsers.map(async (u: any) => {
        const id = u.id;
        const email = u.emailAddresses?.[0]?.emailAddress || 'No Email';
        const name = `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Anonymous User';
        const image = u.imageUrl || '';
        const createdAt = u.createdAt || u.created_at || Date.now();

        // Get count and recent watchlist/continue-watching records
        const watchlistCount = await Watchlist.countDocuments({ userId: id });
        const watchlistItems = await Watchlist.find({ userId: id })
          .sort({ addedAt: -1 })
          .lean();

        const historyCount = await ContinueWatching.countDocuments({ userId: id });
        const recentHistory = await ContinueWatching.find({ userId: id })
          .sort({ timestamp: -1 })
          .lean();

        return {
          id,
          email,
          name,
          image,
          createdAt,
          stats: {
            watchlistCount,
            historyCount,
          },
          watchlistItems: watchlistItems.map((w: any) => ({
            title: w.title,
            poster: w.poster,
            backdrop: w.backdrop,
            mediaType: w.mediaType,
            year: w.year,
            rating: w.rating,
          })),
          recentHistory: recentHistory.map((h: any) => ({
            title: h.title,
            poster: h.poster,
            backdrop: h.backdrop,
            mediaType: h.mediaType,
            progress: h.progress,
            duration: h.duration,
            season: h.season,
            episode: h.episode,
            episodeTitle: h.episodeTitle,
            timestamp: h.timestamp,
          })),
        };
      })
    );

    // General overall stats
    const totalWatchlistItems = await Watchlist.countDocuments();
    const totalHistoryItems = await ContinueWatching.countDocuments();

    return NextResponse.json({
      summary: {
        totalUsers: usersAnalytics.length,
        totalWatchlistItems,
        totalHistoryItems,
      },
      users: usersAnalytics,
    });
  } catch (err: unknown) {
    console.error('Admin analytics error:', err);
    const message = err instanceof Error ? err.message : 'Database error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
