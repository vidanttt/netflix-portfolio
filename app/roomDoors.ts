/**
 * What hangs on the walls of the first-person grid room (home page → Play).
 *
 * Add, remove or reorder entries here: each one becomes a framed poster on the left or right
 * wall. Walk up, aim at it and click (or press E): the project card appears. `href` starting with "/" opens a page of this site, anything else opens
 * in a new tab. Up to 5 per wall fit comfortably.
 *
 * `theme` dresses the door (frame, light and particles, see room/DoorsLayer.tsx) in `color`.
 * The 'portal' theme is a nether portal you walk into instead of opening.
 */
export type DoorTheme = 'portal' | 'creator' | 'bored' | 'developer' | 'github' | 'instagram' | 'contact' | 'jewelry';

/** Paste the Minecraft portfolio's address here: walking into the portal goes there. */
export const MINECRAFT_URL = 'https://minecraft-ui-portfolio.vercel.app';

export type RoomDoor = {
  id: string;
  side: 'left' | 'right';
  theme: DoorTheme;
  color: string;
  tag: string;
  title: string;
  description: string;
  stack?: string[];
  href?: string;
  cta?: string;
  /** a screenshot shown on the wall poster (public/posters); without one the poster is typographic */
  image?: string;
};

export const ROOM_DOORS: RoomDoor[] = [
  {
    id: 'minecraft',
    side: 'left',
    theme: 'portal',
    color: '#a24dff',
    tag: 'Walk in',
    title: 'Minecraft Portfolio',
    description: 'A portfolio built as a Minecraft world.',
    href: MINECRAFT_URL,
  },
  {
    id: 'creator',
    side: 'left',
    theme: 'creator',
    color: '#ff4a3d',
    tag: 'Project',
    title: 'Creator Portfolio',
    description:
      'Motion-led showreel site with a 3D statue you can orbit, a cylindrical video carousel and GSAP choreography.',
    stack: ['Next.js', 'GSAP', 'Three.js', 'Lenis'],
    href: '/creator',
    image: '/posters/creator.jpg',
  },
  {
    id: 'bored',
    side: 'left',
    theme: 'bored',
    color: '#a78bfa',
    tag: 'Project',
    title: 'Bored',
    description:
      'Movie, TV and anime discovery with category browsing, watchlist, continue-watching and a liquid-glass UI.',
    stack: ['Next.js', 'TMDB', 'Clerk', 'MongoDB'],
    href: '/Bored',
    image: '/posters/bored.jpg',
  },
  {
    id: 'developer',
    side: 'left',
    theme: 'developer',
    color: '#4ade80',
    tag: 'Project',
    title: 'Dev Terminal + 3D Lanyard',
    description: 'A physics-driven ID badge (Rapier) beside an interactive resume shell that streams its answers.',
    stack: ['React Three Fiber', 'Rapier', 'TypeScript'],
    href: '/developer',
    image: '/posters/developer.jpg',
  },
  {
    id: 'moon',
    side: 'left',
    theme: 'developer',
    color: '#f5b83d',
    tag: 'Experiment',
    title: 'Live From the Moon',
    description:
      'Neural-network pilots trained with PPO on LunarLander, flying live in your browser. One reward rule taught a rocket to hover forever instead of landing.',
    stack: ['Python', 'PPO', 'Gymnasium', 'Web'],
    href: 'https://live-from-the-moon.vercel.app',
    cta: 'Watch it fly',
    image: '/posters/moon.jpg',
  },
  {
    id: 'cine',
    side: 'right',
    theme: 'bored',
    color: '#b68cff',
    tag: 'Project',
    title: 'CINÉ',
    description: 'Cinema booking where you see the view from your seat before you book: a 3D hall, showtimes and seat picking.',
    stack: ['Three.js', 'React', '3D'],
    href: 'https://3d-cinema-booking.vercel.app/',
    cta: 'Pick a seat',
    image: '/posters/cine.jpg',
  },
  {
    id: 'anand',
    side: 'right',
    theme: 'jewelry',
    color: '#e8c27a',
    tag: 'Client site',
    title: 'Anand Ornaments',
    description:
      'Gold and silver jewellery for bridal, festive and everyday wear, from Maitra, Ramban. An editorial storefront in warm gold on velvet.',
    stack: ['Next.js', 'Tailwind', 'Vercel'],
    href: 'https://dad-boph-eight.vercel.app/',
    cta: 'Visit the shop',
    image: '/posters/anand.jpg',
  },
  {
    id: 'github',
    side: 'right',
    theme: 'github',
    color: '#39d353',
    tag: 'Code',
    title: 'GitHub',
    description: 'Source for this portfolio and everything else I build.',
    href: 'https://github.com/vidanttt',
    cta: 'Open GitHub',
    image: '/posters/github.jpg',
  },
  {
    id: 'instagram',
    side: 'right',
    theme: 'instagram',
    color: '#f0569b',
    tag: 'Editing',
    title: '@180hrtz_',
    description: 'Edits, motion work and behind-the-scenes from 1K+ delivered projects.',
    href: 'https://www.instagram.com/180hrtz_',
    cta: 'Open Instagram',
  },
  {
    id: 'contact',
    side: 'right',
    theme: 'contact',
    color: '#fbbf24',
    tag: 'Say hi',
    title: 'Work with me',
    description: 'Creative development, video editing and motion design. Available for projects.',
    href: 'mailto:vidantforeal@gmail.com',
    cta: 'Send an email',
  },
];

/** Door size in room units (the room is 1 tall). */
export const DOOR_WIDTH = 0.34;
export const DOOR_HEIGHT = 0.62;
/** The stretch of each side wall the doors are spread along (room units, z into the room). */
const DOOR_ZONE: [number, number] = [0.75, 2.55];

/** Where each door sits: side (-1 left, +1 right), its centre along the wall, its look. */
export function doorLayout(doors: RoomDoor[]) {
  const bySide = { left: doors.filter((d) => d.side === 'left'), right: doors.filter((d) => d.side === 'right') };
  return doors.map((door) => {
    const list = bySide[door.side];
    const i = list.indexOf(door);
    const t = list.length === 1 ? 0.5 : i / (list.length - 1);
    return {
      side: door.side === 'left' ? -1 : 1,
      z: DOOR_ZONE[0] + (DOOR_ZONE[1] - DOOR_ZONE[0]) * t,
      theme: door.theme,
      color: door.color,
      portal: door.theme === 'portal',
      dressed: true,
      // everything but the portal hangs on the wall as a framed poster
      poster: door.theme !== 'portal',
      title: door.title,
      tag: door.tag,
      image: door.image,
    };
  });
}
