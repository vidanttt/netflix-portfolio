/**
 * What the creator page shows. The page renders from this and the loading screen preloads
 * exactly this (see lib/preloadAssets.ts), so the two can't drift apart.
 */

/** The cylindrical carousel (files in /public/showreels). */
export const SHOWREELS = [1, 2, 3, 4, 5, 6].map((n) => `/showreels/${n}.mp4`);

/** The "Selected work" reel carousel. */
export const REEL_VIDEOS = [
  'https://res.cloudinary.com/dpuovefvs/video/upload/v1792092415/snapgram.io_1zescuajntue_af5in7.mp4',
  'https://res.cloudinary.com/dpuovefvs/video/upload/v1792092553/snapgram.io_3f15uv2e9h7q_nb2uta.mp4',
  'https://res.cloudinary.com/dpuovefvs/video/upload/v1792094480/vidssave.com_paypal_or_people__valorant_valorantindia_gamergirl_valorantclips_valorantmoments_gaming_720P_simngj.mp4',
  'https://res.cloudinary.com/dpuovefvs/video/upload/q_auto/f_auto/v1777233966/vid1_nc11bz.mp4',
  'https://res.cloudinary.com/dpuovefvs/video/upload/q_auto/f_auto/v1777234062/vid6_usi9t4.mp4',
];

/** Pictures saved in /public/creators, shown only if a creator's live YouTube avatar can't be fetched. */
const SAVED_AVATAR: Record<string, string> = {
  'https://www.youtube.com/@bachuuuuu': '/creators/bachu.jpg',
  'https://www.youtube.com/@realpeachgg': '/creators/peach.jpg',
  'https://www.youtube.com/channel/UCi-dlFETsFvri0zSx8zu-iQ': '/creators/elite-shot.jpg',
  'https://www.youtube.com/dynamogaming': '/creators/dynamo-gaming.jpg',
  'https://www.youtube.com/@s4shhhexe': '/creators/s4sh.jpg',
  'https://www.youtube.com/@_Inferno_playz': '/creators/inferno-playz.jpg',
  'https://www.youtube.com/@vibhorsverse8535': '/creators/vibhors-verse.jpg',
};

const channel = (title: string, channelUrl: string) => ({ title, channelUrl, fallbackThumbnail: SAVED_AVATAR[channelUrl] });

/** The "Creators" parallax grid: 3 rows of 5 tiles (a creator can appear more than once). */
export const CREATOR_CHANNELS = [
  // Row 1
  channel('BACHU', 'https://www.youtube.com/@bachuuuuu'),
  channel('Peach', 'https://www.youtube.com/@realpeachgg'),
  channel('Elite Shot', 'https://www.youtube.com/channel/UCi-dlFETsFvri0zSx8zu-iQ'),
  channel('Dynamo Gaming', 'https://www.youtube.com/dynamogaming'),
  channel('S4sh', 'https://www.youtube.com/@s4shhhexe'),
  // Row 2
  channel('Peach', 'https://www.youtube.com/@realpeachgg'),
  channel('Inferno Playz', 'https://www.youtube.com/@_Inferno_playz'),
  channel('BACHU', 'https://www.youtube.com/@bachuuuuu'),
  channel('Dynamo Gaming', 'https://www.youtube.com/dynamogaming'),
  channel('S4sh', 'https://www.youtube.com/@s4shhhexe'),
  // Row 3
  channel('Vibhors Verse', 'https://www.youtube.com/@vibhorsverse8535'),
  channel('Peach', 'https://www.youtube.com/@realpeachgg'),
  channel('Inferno Playz', 'https://www.youtube.com/@_Inferno_playz'),
  channel('S4sh', 'https://www.youtube.com/@s4shhhexe'),
  channel('Dynamo Gaming', 'https://www.youtube.com/dynamogaming'),
];

/** The hero statue (the biggest single download on the page). */
export const STATUE_MODEL = encodeURI('/3d model.glb');

/** Images the page shows (everything else is a video or a model). */
export const CREATOR_IMAGES = [
  '/hero-statue.png',
  '/image.jpg',
  '/ae-card.jpg',
  '/pr-card.jpg',
  '/davinci-card.png',
  '/blender-card.png',
  '/ps-card.png',
  '/stats/1.jpg',
  '/stats/2.jpg',
  '/stats/3.jpg',
  '/stats/4.jpg',
];
