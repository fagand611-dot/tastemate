// What we know about artists, so one saved song becomes several facets:
// who made it, what it sounds like, how it feels, where it's from and when.
// "Dive — Olivia Dean" → Olivia Dean · neo-soul, soul, pop · warm, uplifting,
// romantic · London · 2020s.
//
// This built-in list covers well-known names; anyone else is looked up on
// MusicBrainz (providers/musicbrainz.js) and cached in the database.
// { role, sounds, moods, from, era }

export const CREATORS = {
  'olivia dean': { role: 'singer-songwriter', sounds: ['neo-soul', 'soul', 'pop'], moods: ['warm', 'uplifting', 'romantic'], from: 'London', era: '2020s' },
  'arlo parks': { role: 'singer-songwriter', sounds: ['indie', 'soul', 'poetry'], moods: ['warm', 'emotional', 'intimate'], from: 'London', era: '2020s' },
  'amy winehouse': { role: 'singer', sounds: ['soul', 'jazz'], moods: ['emotional', 'vintage', 'moody'], from: 'London', era: '2000s' },
  sade: { role: 'band', sounds: ['soul', 'smooth jazz'], moods: ['romantic', 'chill', 'intimate'], from: 'London', era: '1980s' },
  'little simz': { role: 'rapper', sounds: ['hip-hop'], moods: ['cerebral', 'high-energy'], from: 'London', era: '2020s' },
  'jorja smith': { role: 'singer', sounds: ['r&b', 'soul'], moods: ['warm', 'chill'], from: 'Walsall', era: '2020s' },
  raye: { role: 'singer-songwriter', sounds: ['pop', 'soul', 'jazz'], moods: ['emotional', 'high-energy'], from: 'London', era: '2020s' },
  'fred again..': { role: 'producer', sounds: ['house', 'electronic'], moods: ['emotional', 'high-energy', 'uplifting'], from: 'London', era: '2020s' },
  'ezra collective': { role: 'band', sounds: ['jazz', 'afrobeat'], moods: ['high-energy', 'lively', 'uplifting'], from: 'London', era: '2020s' },
  'nubya garcia': { role: 'saxophonist', sounds: ['jazz'], moods: ['cerebral', 'atmospheric'], from: 'London', era: '2020s' },
  'tom misch': { role: 'producer', sounds: ['neo-soul', 'jazz'], moods: ['chill', 'warm'], from: 'London', era: '2010s' },
  burial: { role: 'producer', sounds: ['electronic', 'dubstep'], moods: ['dark', 'atmospheric', 'moody'], from: 'London', era: '2000s' },
  'massive attack': { role: 'band', sounds: ['trip-hop', 'electronic'], moods: ['moody', 'dark', 'atmospheric'], from: 'Bristol', era: '1990s' },
  portishead: { role: 'band', sounds: ['trip-hop', 'electronic'], moods: ['moody', 'dark', 'vintage'], from: 'Bristol', era: '1990s' },
  'nick drake': { role: 'singer-songwriter', sounds: ['folk'], moods: ['chill', 'emotional', 'intimate'], from: 'Warwickshire', era: '1970s' },
  bonobo: { role: 'producer', sounds: ['downtempo', 'electronic'], moods: ['chill', 'atmospheric'], from: 'Brighton', era: '2010s' },
  'floating points': { role: 'producer', sounds: ['electronic', 'jazz'], moods: ['atmospheric', 'cerebral'], from: 'Manchester', era: '2010s' },
  'daft punk': { role: 'duo', sounds: ['house', 'french touch'], moods: ['high-energy', 'uplifting', 'lively'], from: 'Paris', era: '1990s' },
  fkj: { role: 'producer', sounds: ['neo-soul', 'electronic'], moods: ['chill', 'warm'], from: 'Paris', era: '2010s' },
  'rhythim is rhythim': { role: 'producer', sounds: ['techno'], moods: ['high-energy', 'dark'], from: 'Detroit', era: '1980s' },
  'frankie knuckles': { role: 'DJ', sounds: ['house'], moods: ['uplifting', 'high-energy'], from: 'Chicago', era: '1980s' },
  'miles davis': { role: 'trumpeter', sounds: ['jazz', 'cool jazz'], moods: ['cerebral', 'chill', 'moody'], from: 'New York', era: '1950s' },
  'john coltrane': { role: 'saxophonist', sounds: ['jazz'], moods: ['cerebral', 'emotional'], from: 'New York', era: '1960s' },
  'bill evans': { role: 'pianist', sounds: ['jazz', 'cool jazz'], moods: ['intimate', 'chill', 'romantic'], from: 'New York', era: '1960s' },
  'duke ellington': { role: 'bandleader', sounds: ['jazz', 'swing'], moods: ['romantic', 'vintage'], from: 'Washington, D.C.', era: '1940s' },
  'thelonious monk': { role: 'pianist', sounds: ['jazz', 'bebop'], moods: ['cerebral', 'weird'], from: 'New York', era: '1950s' },
  'chet baker': { role: 'trumpeter', sounds: ['jazz', 'cool jazz'], moods: ['romantic', 'intimate', 'vintage'], from: 'Los Angeles', era: '1950s' },
  'dave brubeck': { role: 'pianist', sounds: ['jazz', 'cool jazz'], moods: ['cerebral', 'chill'], from: 'California', era: '1950s' },
  'the dave brubeck quartet': { role: 'band', sounds: ['jazz', 'cool jazz'], moods: ['cerebral', 'chill'], from: 'California', era: '1950s' },
  'nina simone': { role: 'singer', sounds: ['jazz', 'soul'], moods: ['emotional', 'moody'], from: 'North Carolina', era: '1960s' },
  'norah jones': { role: 'singer-songwriter', sounds: ['jazz', 'pop'], moods: ['chill', 'warm', 'romantic'], from: 'New York', era: '2000s' },
  laufey: { role: 'singer-songwriter', sounds: ['jazz', 'pop'], moods: ['romantic', 'vintage', 'warm'], from: 'Reykjavík', era: '2020s' },
  'kamasi washington': { role: 'saxophonist', sounds: ['jazz'], moods: ['epic', 'cerebral'], from: 'Los Angeles', era: '2010s' },
  'herbie hancock': { role: 'pianist', sounds: ['jazz', 'funk'], moods: ['high-energy', 'cerebral'], from: 'Chicago', era: '1970s' },
  'frank ocean': { role: 'singer', sounds: ['r&b'], moods: ['emotional', 'atmospheric'], from: 'New Orleans', era: '2010s' },
  'erykah badu': { role: 'singer', sounds: ['neo-soul'], moods: ['warm', 'cerebral'], from: 'Dallas', era: '1990s' },
  "d'angelo": { role: 'singer', sounds: ['neo-soul', 'r&b'], moods: ['intimate', 'moody'], from: 'Richmond, Virginia', era: '1990s' },
  'hiatus kaiyote': { role: 'band', sounds: ['neo-soul', 'jazz'], moods: ['weird', 'warm'], from: 'Melbourne', era: '2010s' },
  khruangbin: { role: 'band', sounds: ['psychedelic soul', 'funk'], moods: ['chill', 'vintage', 'warm'], from: 'Houston', era: '2010s' },
  'bon iver': { role: 'band', sounds: ['folk', 'indie'], moods: ['emotional', 'atmospheric'], from: 'Wisconsin', era: '2010s' },
  'joni mitchell': { role: 'singer-songwriter', sounds: ['folk'], moods: ['emotional', 'intimate'], from: 'Alberta', era: '1970s' },
  'phoebe bridgers': { role: 'singer-songwriter', sounds: ['indie', 'folk'], moods: ['emotional', 'moody'], from: 'Los Angeles', era: '2020s' },
  'max richter': { role: 'composer', sounds: ['modern classical'], moods: ['atmospheric', 'emotional'], from: 'Berlin', era: '2000s' },
  'ólafur arnalds': { role: 'composer', sounds: ['modern classical', 'ambient'], moods: ['atmospheric', 'chill'], from: 'Reykjavík', era: '2010s' },
};

// Sounds outside the core genre list, mapped onto the genre they belong to,
// so a neo-soul save still counts for soul.
export const SOUND_PARENTS = {
  'neo-soul': 'soul',
  'smooth jazz': 'jazz',
  'cool jazz': 'jazz',
  bebop: 'jazz',
  swing: 'jazz',
  'trip-hop': 'electronic',
  downtempo: 'electronic',
  dubstep: 'electronic',
  'french touch': 'house',
  'modern classical': 'classical',
  'psychedelic soul': 'soul',
  afrobeat: 'jazz',
  'r&b': 'soul',
  funk: 'soul',
};

/** Facts about a creator, from the built-in list or a cache of looked-up ones. */
export function creatorFacts(name, cache) {
  if (!name) return null;
  const key = name.trim().toLowerCase();
  return CREATORS[key] || cache?.get(key) || null;
}
