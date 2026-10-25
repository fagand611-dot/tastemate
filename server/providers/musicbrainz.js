// Look up an artist the built-in list doesn't know on MusicBrainz, the open
// music database: where they're from, what they sound like (from community
// tags), and when they formed (bands only; a person's start date is a birth
// date, which says nothing about their era). No key needed, but MusicBrainz
// asks for a descriptive User-Agent and at most one request a second; the
// enricher (server/enrich.js) paces requests and caches every answer.
//
// Env: MUSICBRAINZ=off to disable, MUSICBRAINZ_UA to set the User-Agent.
import { SOUND_PARENTS } from '../creators.js';
import { normalizeGenre } from '../taxonomy.js';

const API = 'https://musicbrainz.org/ws/2/artist';
const ALIASES = { 'neo soul': 'neo-soul', 'trip hop': 'trip-hop', 'rnb': 'r&b', 'rhythm and blues': 'r&b', 'contemporary r&b': 'r&b', 'modern classical': 'modern classical' };

/** Turn MusicBrainz tags into sounds we know, strongest first. */
export function soundsFromTags(tags = []) {
  const out = [];
  for (const t of [...tags].sort((a, b) => (b.count || 0) - (a.count || 0))) {
    const raw = String(t.name || '').toLowerCase().trim();
    const name = ALIASES[raw] || raw;
    const sound = SOUND_PARENTS[name] ? name : normalizeGenre(name) === name ? name : null;
    if (sound && !out.includes(sound)) out.push(sound);
    if (out.length === 3) break;
  }
  return out;
}

export function createArtistLookup({
  enabled = process.env.MUSICBRAINZ !== 'off',
  userAgent = process.env.MUSICBRAINZ_UA || 'Tastemate/0.1 (https://github.com/fagand611-dot/tastemate)',
  fetchImpl = fetch,
} = {}) {
  if (!enabled) return null;
  /** Facts for an artist, null when MusicBrainz has no confident match; throws on network trouble. */
  return async function lookup(name) {
    const url = `${API}?query=${encodeURIComponent(`artist:"${name.replace(/"/g, '')}"`)}&fmt=json&limit=3`;
    const res = await fetchImpl(url, { headers: { 'User-Agent': userAgent, Accept: 'application/json' } });
    if (!res.ok) throw new Error(`MusicBrainz HTTP ${res.status}`);
    const { artists = [] } = await res.json();
    const want = name.trim().toLowerCase();
    const a = artists.find((x) => x.name?.toLowerCase() === want && (x.score ?? 100) >= 90);
    if (!a) return null;
    const group = a.type === 'Group';
    const begin = Number(String(a['life-span']?.begin || '').slice(0, 4));
    return {
      role: group ? 'band' : 'artist',
      sounds: soundsFromTags(a.tags),
      moods: [],
      from: a['begin-area']?.name || a.area?.name || null,
      era: group && begin ? `${Math.floor(begin / 10) * 10}s` : null,
    };
  };
}
