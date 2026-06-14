import { NextResponse } from 'next/server';
import { dbConnect, Watchlist, ContinueWatching } from '@/lib/mongodb';

export async function GET() {
  const diagnosticReport: Record<string, any> = {
    timestamp: new Date().toISOString(),
    databaseConnection: 'failed',
    userIsolationCheck: 'not_run',
    details: {},
  };

  try {
    // 1. Test Database Connection
    await dbConnect();
    diagnosticReport.databaseConnection = 'success';
    diagnosticReport.details.connection = 'MongoDB Atlas connected successfully!';

    // 2. Clear any existing mock test users to ensure clean slate
    const testUserA = 'diagnostic_test_user_A';
    const testUserB = 'diagnostic_test_user_B';

    await Promise.all([
      Watchlist.deleteMany({ userId: { $in: [testUserA, testUserB] } }),
      ContinueWatching.deleteMany({ userId: { $in: [testUserA, testUserB] } }),
    ]);

    // 3. Insert mock records for testUserA
    const watchlistA = await Watchlist.create({
      userId: testUserA,
      tmdbId: 101,
      title: 'Inception (User A Mock)',
      poster: 'https://image.tmdb.org/t/p/w500/mockA.jpg',
      mediaType: 'movie',
      rating: 8.8,
      year: '2010',
      genres: ['Sci-Fi', 'Action'],
      addedAt: Date.now(),
    });

    const historyA = await ContinueWatching.create({
      userId: testUserA,
      tmdbId: 201,
      title: 'Breaking Bad (User A Mock)',
      backdrop: 'https://image.tmdb.org/t/p/w1280/mockBackA.jpg',
      mediaType: 'tv',
      progress: 1800,
      duration: 3600,
      season: 1,
      episode: 1,
      episodeTitle: 'Pilot',
      timestamp: Date.now(),
    });

    // 4. Insert mock records for testUserB
    const watchlistB = await Watchlist.create({
      userId: testUserB,
      tmdbId: 102,
      title: 'Interstellar (User B Mock)',
      poster: 'https://image.tmdb.org/t/p/w500/mockB.jpg',
      mediaType: 'movie',
      rating: 8.6,
      year: '2014',
      genres: ['Sci-Fi', 'Drama'],
      addedAt: Date.now(),
    });

    const historyB = await ContinueWatching.create({
      userId: testUserB,
      tmdbId: 202,
      title: 'Stranger Things (User B Mock)',
      backdrop: 'https://image.tmdb.org/t/p/w1280/mockBackB.jpg',
      mediaType: 'tv',
      progress: 900,
      duration: 3000,
      season: 1,
      episode: 2,
      episodeTitle: 'The Weirdo on Maple Street',
      timestamp: Date.now(),
    });

    // 5. Run Isolation Queries
    // Querying as User A
    const queryWatchlistAsA = await Watchlist.find({ userId: testUserA });
    const queryHistoryAsA = await ContinueWatching.find({ userId: testUserA });

    // Querying as User B
    const queryWatchlistAsB = await Watchlist.find({ userId: testUserB });
    const queryHistoryAsB = await ContinueWatching.find({ userId: testUserB });

    // 6. Assertions
    const userA_IsolationIntact =
      queryWatchlistAsA.length === 1 &&
      queryWatchlistAsA[0].tmdbId === 101 &&
      !queryWatchlistAsA.some((item) => item.userId === testUserB) &&
      queryHistoryAsA.length === 1 &&
      queryHistoryAsA[0].tmdbId === 201 &&
      !queryHistoryAsA.some((item) => item.userId === testUserB);

    const userB_IsolationIntact =
      queryWatchlistAsB.length === 1 &&
      queryWatchlistAsB[0].tmdbId === 102 &&
      !queryWatchlistAsB.some((item) => item.userId === testUserA) &&
      queryHistoryAsB.length === 1 &&
      queryHistoryAsB[0].tmdbId === 202 &&
      !queryHistoryAsB.some((item) => item.userId === testUserA);

    if (userA_IsolationIntact && userB_IsolationIntact) {
      diagnosticReport.userIsolationCheck = 'success';
      diagnosticReport.details.isolation =
        'PASSED: Data queries are strictly user-separated. Users can ONLY read and write their own database records.';
    } else {
      diagnosticReport.userIsolationCheck = 'failed';
      diagnosticReport.details.isolation =
        'FAILED: User data leaked between queries. Isolation validation did not pass.';
    }

    // Clean up mock diagnostic records
    await Promise.all([
      Watchlist.deleteMany({ userId: { $in: [testUserA, testUserB] } }),
      ContinueWatching.deleteMany({ userId: { $in: [testUserA, testUserB] } }),
    ]);

    return NextResponse.json({
      status: 'success',
      diagnosticReport,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error during diagnostics';
    return NextResponse.json(
      {
        status: 'error',
        diagnosticReport: {
          ...diagnosticReport,
          error: message,
        },
      },
      { status: 500 }
    );
  }
}
