export const upcomingMatches = [
  {
    id: '1',
    team1: { name: 'Phoenix Rising', score: undefined },
    team2: { name: 'Cyber Wolves', score: undefined },
    date: '28 Gru',
    time: '18:00',
    status: 'upcoming' as const,
  },
  {
    id: '2',
    team1: { name: 'Storm Breakers', score: undefined },
    team2: { name: 'Night Hawks', score: undefined },
    date: '28 Gru',
    time: '20:00',
    status: 'upcoming' as const,
  },
  {
    id: '3',
    team1: { name: 'Arctic Foxes', score: undefined },
    team2: { name: 'Thunder Strike', score: undefined },
    date: '29 Gru',
    time: '16:00',
    status: 'upcoming' as const,
  },
];

export const recentMatches = [
  {
    id: '4',
    team1: { name: 'Dragon Force', score: 2 },
    team2: { name: 'Shadow Legion', score: 1 },
    date: '26 Gru',
    time: '19:00',
    status: 'finished' as const,
  },
  {
    id: '5',
    team1: { name: 'Venom Squad', score: 0 },
    team2: { name: 'Elite Warriors', score: 2 },
    date: '26 Gru',
    time: '17:00',
    status: 'finished' as const,
  },
  {
    id: '6',
    team1: { name: 'Blaze Gaming', score: 2 },
    team2: { name: 'Frost Giants', score: 2 },
    date: '25 Gru',
    time: '20:00',
    status: 'finished' as const,
  },
];

export const allMatches = [
  ...upcomingMatches,
  ...recentMatches,
  {
    id: '7',
    team1: { name: 'Phoenix Rising', score: 2 },
    team2: { name: 'Night Hawks', score: 0 },
    date: '24 Gru',
    time: '18:00',
    status: 'finished' as const,
  },
  {
    id: '8',
    team1: { name: 'Storm Breakers', score: 1 },
    team2: { name: 'Dragon Force', score: 2 },
    date: '23 Gru',
    time: '19:00',
    status: 'finished' as const,
  },
];

export const teams = [
  {
    id: 'phoenix-rising',
    name: 'Phoenix Rising',
    memberCount: 8,
    status: 'ready' as const,
    members: {
      players: [
        { nick: 'FlameX', role: 'IGL' },
        { nick: 'AshStorm', role: 'Entry' },
        { nick: 'Ember', role: 'AWP' },
        { nick: 'Phoenix', role: 'Support' },
        { nick: 'Blaze', role: 'Lurker' },
      ],
      reserves: [
        { nick: 'Spark', role: 'Flex' },
        { nick: 'Inferno', role: 'Entry' },
      ],
      coach: { nick: 'FireMaster', role: 'Head Coach' },
    },
  },
  {
    id: 'cyber-wolves',
    name: 'Cyber Wolves',
    memberCount: 8,
    status: 'ready' as const,
    members: {
      players: [
        { nick: 'AlphaWolf', role: 'IGL' },
        { nick: 'ShadowByte', role: 'Entry' },
        { nick: 'CyberHunt', role: 'AWP' },
        { nick: 'PackLeader', role: 'Support' },
        { nick: 'NightProwl', role: 'Lurker' },
      ],
      reserves: [
        { nick: 'ByteRunner', role: 'Flex' },
        { nick: 'DataWolf', role: 'Entry' },
      ],
      coach: { nick: 'WolfMaster', role: 'Head Coach' },
    },
  },
  {
    id: 'storm-breakers',
    name: 'Storm Breakers',
    memberCount: 7,
    status: 'preparing' as const,
    members: {
      players: [
        { nick: 'Thunder', role: 'IGL' },
        { nick: 'Lightning', role: 'Entry' },
        { nick: 'Cyclone', role: 'AWP' },
        { nick: 'Tempest', role: 'Support' },
        { nick: 'Tornado', role: 'Lurker' },
      ],
      reserves: [
        { nick: 'Gust', role: 'Flex' },
      ],
      coach: { nick: 'StormLord', role: 'Head Coach' },
    },
  },
  {
    id: 'night-hawks',
    name: 'Night Hawks',
    memberCount: 8,
    status: 'ready' as const,
    members: {
      players: [
        { nick: 'NightEye', role: 'IGL' },
        { nick: 'ShadowWing', role: 'Entry' },
        { nick: 'DarkTalon', role: 'AWP' },
        { nick: 'MoonHawk', role: 'Support' },
        { nick: 'SilentStrike', role: 'Lurker' },
      ],
      reserves: [
        { nick: 'Nightfall', role: 'Flex' },
        { nick: 'DuskHunter', role: 'Entry' },
      ],
      coach: { nick: 'HawkEye', role: 'Head Coach' },
    },
  },
  {
    id: 'arctic-foxes',
    name: 'Arctic Foxes',
    memberCount: 6,
    status: 'preparing' as const,
    members: {
      players: [
        { nick: 'Frost', role: 'IGL' },
        { nick: 'Blizzard', role: 'Entry' },
        { nick: 'IceBite', role: 'AWP' },
        { nick: 'Snowfall', role: 'Support' },
        { nick: 'Glacier', role: 'Lurker' },
      ],
      reserves: [],
      coach: { nick: 'ArcticWind', role: 'Head Coach' },
    },
  },
  {
    id: 'dragon-force',
    name: 'Dragon Force',
    memberCount: 8,
    status: 'ready' as const,
    members: {
      players: [
        { nick: 'DragonLord', role: 'IGL' },
        { nick: 'FireBreath', role: 'Entry' },
        { nick: 'ScaleClaw', role: 'AWP' },
        { nick: 'WingStorm', role: 'Support' },
        { nick: 'TailWhip', role: 'Lurker' },
      ],
      reserves: [
        { nick: 'DragonEgg', role: 'Flex' },
        { nick: 'FlameScale', role: 'Entry' },
      ],
      coach: { nick: 'DragonMaster', role: 'Head Coach' },
    },
  },
];

export const sponsors = [
  { id: '1', name: 'TechGear Pro', logo: 'https://placehold.co/100x100/1a1a2e/00d4ff?text=TG' },
  { id: '2', name: 'GameFuel Energy', logo: 'https://placehold.co/100x100/1a1a2e/00d4ff?text=GF' },
  { id: '3', name: 'StreamMax', logo: 'https://placehold.co/100x100/1a1a2e/00d4ff?text=SM' },
  { id: '4', name: 'PixelWorks', logo: 'https://placehold.co/100x100/1a1a2e/00d4ff?text=PW' },
  { id: '5', name: 'CyberNet', logo: 'https://placehold.co/100x100/1a1a2e/00d4ff?text=CN' },
  { id: '6', name: 'ElitePC', logo: 'https://placehold.co/100x100/1a1a2e/00d4ff?text=EP' },
];
