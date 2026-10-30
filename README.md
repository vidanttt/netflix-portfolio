# Vidaant

Portfolio of Vidant Sharma (video editor, motion designer and creative developer), built as a
"Who's watching?" profile screen. Pick a profile, or walk around the room in first person.

## What's in it

| Route | What it is |
| --- | --- |
| `/` | The profile screen: the Netflix-style intro, the profile picker and a first-person grid room (WASD + mouse) with doors to projects, a nether portal to the Minecraft portfolio, a tablet for settings and a training range behind the spawn wall |
| `/creator` | Video editor and motion designer portfolio: 3D statue hero, showreels, creators worked with, selected reels, tools, contact |
| `/developer` | Creative developer page: a physics-driven 3D ID badge (Rapier) next to an interactive terminal |
| `/Bored` | A separate movie, TV and anime discovery app (TMDB, Clerk sign-in, MongoDB watchlist) |

The doors in the room live in [`app/roomDoors.ts`](app/roomDoors.ts); the creator page's videos and
creators live in [`lib/creatorContent.ts`](lib/creatorContent.ts) (the loading screen preloads from the same list).

## Stack

Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS 3, GSAP, Framer Motion,
Three.js with React Three Fiber, Rapier, Lenis, Clerk, MongoDB (Mongoose), Vercel Analytics and
Speed Insights.

## Run it

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build
npm run lint    # ESLint (errors fail it; the React-compiler rules only warn)
```

## Environment

Create `.env.local` (never commit it):

| Variable | Used for |
| --- | --- |
| `TMDB_ACCESS_TOKEN` (or `TMDB_API_KEY`) | Bored: movie and TV data |
| `MONGODB_URI` | Bored: watchlist and watch history |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Sign-in (use live keys in production) |
| `NEXT_PUBLIC_ADMIN_EMAIL`, `ADMIN_EMAIL` | Who can open the Bored admin page |
| `NEXT_PUBLIC_SITE_URL` | Optional: the public address used by `robots.txt` and `sitemap.xml`. On Vercel the production domain is picked up automatically |

## Deploying

Deploy to Vercel. Turn on **Web Analytics** and **Speed Insights** for the project in the Vercel
dashboard to see visitors and Core Web Vitals (the code that reports them is already in `app/layout.tsx`).

## Credits

- Draconia character: model by HiGuys920, CC BY 4.0
- Swordswoman character: model by Xavi Vidal, CC BY 4.0
- Gun, footstep and impact sounds: CC0 libraries, the Free Firearm Sound Library and Kenney's Impact Sounds
