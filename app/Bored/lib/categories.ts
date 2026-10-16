/* ════════════════════════════════════════════════════
   BORED — Browse-by-category config
   Every category is just a set of TMDB discover queries, so titles open in the same
   detail modal / player flow as the rest of the app.
   ════════════════════════════════════════════════════ */

export interface RowCfg {
  title: string;
  endpoint: string;
  params?: Record<string, string>;
  type: 'movie' | 'tv';
}

export interface Category {
  slug: string;
  label: string;
  tagline: string;
  /** Tint used behind the tile's line icon */
  accent: string;
  batches: RowCfg[][];
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => iso(new Date(Date.now() - n * 86400000));

const tv = (title: string, params: Record<string, string> = {}): RowCfg => ({
  title,
  endpoint: 'discover/tv',
  params: { sort_by: 'popularity.desc', ...params },
  type: 'tv',
});
const movie = (title: string, params: Record<string, string> = {}): RowCfg => ({
  title,
  endpoint: 'discover/movie',
  params: { sort_by: 'popularity.desc', ...params },
  type: 'movie',
});

const TOP = { sort_by: 'vote_average.desc', 'vote_count.gte': '500' };

/** Standard rows for a genre-style category */
function genreBatches(label: string, movieGenre: string, tvGenre?: string): RowCfg[][] {
  const m = { with_genres: movieGenre };
  const t = tvGenre ? { with_genres: tvGenre } : null;
  return [
    [
      movie(`Popular ${label} Movies`, m),
      movie(`Top Rated ${label} Movies`, { ...m, ...TOP }),
      ...(t ? [tv(`Popular ${label} Shows`, t)] : []),
    ],
    [
      movie(`Recent ${label}`, { ...m, 'primary_release_date.gte': daysAgo(730), 'primary_release_date.lte': iso(new Date()) }),
      ...(t ? [tv(`Top Rated ${label} Shows`, { ...t, ...TOP })] : []),
      movie(`${label} Classics`, { ...m, ...TOP, 'primary_release_date.lte': '1999-12-31' }),
    ],
    [
      movie(`Hidden ${label} Gems`, {
        ...m,
        sort_by: 'vote_average.desc',
        'vote_count.gte': '100',
        'vote_count.lte': '700',
        'vote_average.gte': '7.2',
      }),
      movie(`${label} — Page 2`, { ...m, page: '2' }),
      ...(t ? [tv(`${label} Shows — Page 2`, { ...t, page: '2' })] : []),
    ],
  ];
}

export const CATEGORIES: Category[] = [
  {
    slug: 'anime',
    label: 'Anime',
    tagline: 'Japanese animation — series and films',
    accent: '#ff6b9d',
    batches: (() => {
      const a = { with_genres: '16', with_original_language: 'ja' };
      return [
        [
          tv('Popular Anime', a),
          tv('Airing Now', { ...a, 'air_date.gte': daysAgo(21), 'air_date.lte': iso(new Date()), 'first_air_date.gte': daysAgo(900) }),
          tv('Top Rated Anime', { ...a, ...TOP }),
        ],
        [
          tv('Action & Adventure', { ...a, with_genres: '16,10759' }),
          tv('Sci-Fi & Fantasy', { ...a, with_genres: '16,10765' }),
          tv('Comedy', { ...a, with_genres: '16,35' }),
        ],
        [
          movie('Anime Movies', a),
          movie('Top Rated Anime Movies', { ...a, sort_by: 'vote_average.desc', 'vote_count.gte': '300' }),
          tv('Drama', { ...a, with_genres: '16,18' }),
        ],
        [
          tv('Mystery & Thriller', { ...a, with_genres: '16,9648' }),
          tv('Classics', { ...a, 'first_air_date.lte': '2006-12-31', sort_by: 'vote_average.desc', 'vote_count.gte': '200' }),
          tv('Hidden Gems', { ...a, sort_by: 'vote_average.desc', 'vote_count.gte': '100', 'vote_count.lte': '700', 'vote_average.gte': '7.5' }),
        ],
        [
          tv('Popular — Page 2', { ...a, page: '2' }),
          movie('Anime Movies — Page 2', { ...a, page: '2' }),
          tv('Top Rated — Page 2', { ...a, ...TOP, page: '2' }),
        ],
      ];
    })(),
  },
  {
    slug: 'cartoons',
    label: 'Cartoons',
    tagline: 'Animated shows and films from the West',
    accent: '#ffb454',
    batches: (() => {
      // Western cartoons: animation in English (discover can't exclude a language)
      const en = { with_genres: '16', with_original_language: 'en' };
      return [
        [
          tv('Popular Cartoons', en),
          tv('Kids Shows', { with_genres: '16,10762', with_original_language: 'en' }),
          tv('Top Rated Cartoons', { ...en, ...TOP }),
        ],
        [
          tv('Comedy Cartoons', { ...en, with_genres: '16,35' }),
          tv('Action & Adventure', { ...en, with_genres: '16,10759' }),
          tv('Sci-Fi & Fantasy', { ...en, with_genres: '16,10765' }),
        ],
        [
          tv('Cartoon Network', { with_genres: '16', with_networks: '56' }),
          tv('Nickelodeon', { with_genres: '16', with_networks: '13' }),
          tv('Disney Channel', { with_genres: '16', with_networks: '54' }),
        ],
        [
          movie('Animated Movies', en),
          movie('Top Rated Animated Movies', { ...en, sort_by: 'vote_average.desc', 'vote_count.gte': '500' }),
          movie('Disney & Pixar', { with_genres: '16', with_companies: '2|3' }),
        ],
        [
          tv('Adult Animation', { ...en, with_genres: '16,35', 'vote_count.gte': '200', sort_by: 'vote_average.desc' }),
          tv('Classic Cartoons', { ...en, 'first_air_date.lte': '2002-12-31', sort_by: 'vote_average.desc', 'vote_count.gte': '100' }),
          tv('Popular — Page 2', { ...en, page: '2' }),
        ],
      ];
    })(),
  },
  {
    slug: 'kdrama',
    label: 'K-Drama',
    tagline: 'Korean dramas and films',
    accent: '#5ee6a8',
    batches: (() => {
      const k = { with_original_language: 'ko' };
      return [
        [tv('Popular K-Dramas', k), tv('Top Rated K-Dramas', { ...k, ...TOP, 'vote_count.gte': '200' }), movie('Korean Movies', k)],
        [
          tv('Romance & Drama', { ...k, with_genres: '18' }),
          tv('Thriller & Mystery', { ...k, with_genres: '9648' }),
          tv('Action & Adventure', { ...k, with_genres: '10759' }),
        ],
        [
          tv('Comedy', { ...k, with_genres: '35' }),
          movie('Top Rated Korean Movies', { ...k, sort_by: 'vote_average.desc', 'vote_count.gte': '300' }),
          tv('Popular — Page 2', { ...k, page: '2' }),
        ],
      ];
    })(),
  },
  {
    slug: 'bollywood',
    label: 'Bollywood',
    tagline: 'Hindi films and shows',
    accent: '#ffd166',
    batches: (() => {
      const h = { with_original_language: 'hi' };
      return [
        [movie('Popular Hindi Movies', h), movie('Top Rated Hindi Movies', { ...h, ...TOP, 'vote_count.gte': '200' }), tv('Hindi Shows', h)],
        [
          movie('Recent Releases', { ...h, 'primary_release_date.gte': daysAgo(500), 'primary_release_date.lte': iso(new Date()) }),
          movie('Action', { ...h, with_genres: '28' }),
          movie('Comedy', { ...h, with_genres: '35' }),
        ],
        [
          movie('Romance', { ...h, with_genres: '10749' }),
          movie('Drama', { ...h, with_genres: '18', sort_by: 'vote_average.desc', 'vote_count.gte': '100' }),
          movie('Popular — Page 2', { ...h, page: '2' }),
        ],
      ];
    })(),
  },
  { slug: 'action', label: 'Action', tagline: 'Big stunts, bigger explosions', accent: '#ff6b5e', batches: genreBatches('Action', '28', '10759') },
  { slug: 'comedy', label: 'Comedy', tagline: 'Laugh it off', accent: '#ffd84d', batches: genreBatches('Comedy', '35', '35') },
  { slug: 'horror', label: 'Horror', tagline: 'Lights on recommended', accent: '#9aa0ff', batches: genreBatches('Horror', '27') },
  { slug: 'scifi', label: 'Sci-Fi', tagline: 'Space, tech and what-ifs', accent: '#5cc8ff', batches: genreBatches('Sci-Fi', '878', '10765') },
  { slug: 'romance', label: 'Romance', tagline: 'Feel-good and heartbreak', accent: '#ff8fb1', batches: genreBatches('Romance', '10749') },
  { slug: 'documentary', label: 'Documentary', tagline: 'True stories', accent: '#7fd99a', batches: genreBatches('Documentary', '99', '99') },
];

export const getCategory = (slug: string) => CATEGORIES.find((c) => c.slug === slug);
