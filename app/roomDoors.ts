/**
 * Doors in the first-person grid room (home page → Play).
 *
 * Add, remove or reorder entries here: each one becomes a door on the left or right wall with
 * a sign above it. Walk up, aim at it and click (or press E): the door slides open and the
 * project card appears. `href` starting with "/" opens a page of this site, anything else opens
 * in a new tab. Up to 4 doors per wall fit comfortably.
 *
 * `theme` dresses the door (frame, light and particles, see room/DoorsLayer.tsx) in `color`.
 * The 'portal' theme is a nether portal you walk into instead of opening.
 */
export type DoorTheme = 'portal' | 'creator' | 'bored' | 'developer' | 'github' | 'instagram' | 'contact';

/** Paste the Minecraft portfolio's address here: walking into the portal goes there. */
export const MINECRAFT_URL = '';

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
    };
  });
}
