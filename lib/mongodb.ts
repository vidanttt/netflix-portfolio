import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
interface GlobalMongoose {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCached: GlobalMongoose | undefined;
}

let cached = global.mongooseCached;

if (!cached) {
  cached = global.mongooseCached = { conn: null, promise: null };
}

export async function dbConnect() {
  if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
  }

  if (cached!.conn) {
    return cached!.conn;
  }

  if (!cached!.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached!.promise = mongoose.connect(MONGODB_URI!, opts).then((mongooseInstance) => {
      return mongooseInstance;
    });
  }

  try {
    cached!.conn = await cached!.promise;
  } catch (e) {
    cached!.promise = null;
    throw e;
  }

  return cached!.conn;
}

/* ════════════════════════════════════════════════════
   MONGOOSE MODELS & SCHEMAS
   ════════════════════════════════════════════════════ */

// Watchlist Schema
const WatchlistSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    tmdbId: { type: Number, required: true },
    title: { type: String, required: true },
    poster: { type: String, required: true },
    backdrop: { type: String, default: '' },
    mediaType: { type: String, enum: ['movie', 'tv'], required: true },
    rating: { type: Number, default: 0 },
    year: { type: String, default: '' },
    genres: { type: [String], default: [] },
    addedAt: { type: Number, default: Date.now },
  },
  { timestamps: true }
);

// Unique compound index: a user can only add a specific media item once
WatchlistSchema.index({ userId: 1, tmdbId: 1, mediaType: 1 }, { unique: true });

// Continue Watching (Watch History) Schema
const ContinueWatchingSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    tmdbId: { type: Number, required: true },
    title: { type: String, required: true },
    poster: { type: String, default: '' },
    backdrop: { type: String, required: true },
    mediaType: { type: String, enum: ['movie', 'tv'], required: true },
    progress: { type: Number, required: true }, // in seconds
    duration: { type: Number, required: true }, // in seconds
    season: { type: Number },
    episode: { type: Number },
    episodeTitle: { type: String },
    timestamp: { type: Number, default: Date.now },
  },
  { timestamps: true }
);

// Unique compound index: a user has one progress state per media item
ContinueWatchingSchema.index({ userId: 1, tmdbId: 1, mediaType: 1 }, { unique: true });

export const Watchlist = mongoose.models.Watchlist || mongoose.model('Watchlist', WatchlistSchema);
export const ContinueWatching = mongoose.models.ContinueWatching || mongoose.model('ContinueWatching', ContinueWatchingSchema);
