export const MAP_THUMBNAILS: Record<string, string> = {
  de_mirage: '/maps/de_mirage.jpg',
  de_dust2: '/maps/de_dust2.jpg',
  de_anubis: '/maps/de_anubis.jpg',
  de_inferno: '/maps/de_inferno.jpg',
  de_overpass: '/maps/de_overpass.jpg',
  de_nuke: '/maps/de_nuke.jpg',
  de_ancient: '/maps/de_ancient.jpg',
};

export const MAP_NAMES = [
  'de_mirage',
  'de_dust2',
  'de_anubis',
  'de_inferno',
  'de_overpass',
  'de_nuke',
  'de_ancient',
] as const;

export const getMapThumbnail = (mapName: string): string => {
  const key = mapName.toLowerCase().replace(/\s+/g, '_');
  return MAP_THUMBNAILS[key] || '/placeholder.svg';
};

export const getMapDisplayName = (mapName: string): string => {
  return mapName.replace('de_', '').charAt(0).toUpperCase() + mapName.replace('de_', '').slice(1);
};
