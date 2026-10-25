import { HttpError, ah, intParam } from '../http.js';
import { requireUser } from '../auth.js';
import { friendIds, hydrateSave, hydrateSpot, tx, upsertSpot } from '../db.js';
import { parseImport } from '../importers.js';
import { SAVE_KINDS, SAVE_SOURCES, autoTag, cleanTags, guessKind } from '../taxonomy.js';
import { cosine, findPatterns, interpret, perfectDay, rankSpots, tasteCharacter, tasteProfile, toPercent } from '../taste-graph.js';
import { loadCreatorCache } from '../enrich.js';
import { parsePost } from '../posts.js';
import { OCCASIONS, planOccasion } from '../occasions.js';

const IMPORT_SOURCES = ['spotify', 'instagram', 'google_maps', 'pinterest'];
const PER_KIND = { event: 12, place: 12, product: 8 };
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export default function savesRoutes(r, { db, venueFeed, enricher }) {
  // Saves read with everything known about their artists.
  const readSaves = (userId) => interpret(getSaves(userId), { cache: loadCreatorCache(db) });
  const getSaves = (userId) => db.prepare('SELECT * FROM saves WHERE user_id = ? ORDER BY COALESCE(saved_at, created_at) DESC, id DESC').all(userId).map(hydrateSave);
  const cities = () => db.prepare('SELECT DISTINCT city FROM spots WHERE city IS NOT NULL ORDER BY city').all().map((x) => x.city);
  const homeCity = (userId) => db.prepare('SELECT home_city FROM users WHERE id = ?').get(userId)?.home_city ?? null;
  // Curated and feed spots are public; spots someone added from a post are
  // shown to them and their friends.
  const visibleSpots = (userId) => {
    const ids = [userId, ...friendIds(db, userId)];
    return db.prepare(`SELECT * FROM spots WHERE added_by IS NULL OR added_by IN (${ids.map(() => '?').join(',')})`).all(...ids).map(hydrateSpot);
  };
  const ownSave = (req) => {
    const s = db.prepare('SELECT * FROM saves WHERE id = ? AND user_id = ?').get(intParam(req.params.id), req.user.id);
    if (!s) throw new HttpError(404, 'Save not found');
    return hydrateSave(s);
  };

  // ----- Saves -----
  r.get('/saves', requireUser, (req, res) => {
    // Each save comes with its breakdown: what it says, grouped by facet.
    const all = readSaves(req.user.id).map(({ signals, ...s }) => ({ ...s, facets: breakdown(signals) }));
    const count = (key) => all.reduce((m, s) => ({ ...m, [s[key]]: (m[s[key]] || 0) + 1 }), {});
    res.json({ saves: all, counts: { kind: count('kind'), source: count('source') }, kinds: SAVE_KINDS, sources: SAVE_SOURCES, lookingUp: enricher.pending() });
  });

  r.post('/saves', requireUser, (req, res) => {
    const b = req.body || {};
    const title = String(b.title || '').trim().slice(0, 200);
    if (!title) throw new HttpError(400, 'Title is required');
    const text = [title, b.creator, b.note, b.collection].map((x) => (x ? String(x).slice(0, 500) : null));
    const tags = cleanTags([...(b.tags || []), ...autoTag(text[0], text[1], text[3], text[2], loadCreatorCache(db))]);
    const kind = SAVE_KINDS.includes(b.kind) ? b.kind : guessKind(tags, text[1] ? 'song' : 'other');
    const id = db
      .prepare(`INSERT INTO saves (user_id, kind, title, creator, source, collection, url, note, city, tags) VALUES (?,?,?,?, 'manual', ?,?,?,?,?)`)
      .run(req.user.id, kind, title, text[1], text[3], cleanUrl(b.url), text[2], cleanCity(b.city), JSON.stringify(tags)).lastInsertRowid;
    if (kind === 'song' && text[1]) enricher.queue([text[1]]);
    res.status(201).json({ save: hydrateSave(db.prepare('SELECT * FROM saves WHERE id = ?').get(id)) });
  });

  r.patch('/saves/:id', requireUser, (req, res) => {
    const s = ownSave(req);
    const b = req.body || {};
    const next = {
      kind: SAVE_KINDS.includes(b.kind) ? b.kind : s.kind,
      tags: b.tags !== undefined ? cleanTags(b.tags) : s.tags,
      note: b.note !== undefined ? (String(b.note).slice(0, 500) || null) : s.note,
      city: b.city !== undefined ? cleanCity(b.city) : s.city,
    };
    db.prepare('UPDATE saves SET kind = ?, tags = ?, note = ?, city = ? WHERE id = ?').run(next.kind, JSON.stringify(next.tags), next.note, next.city, s.id);
    res.json({ save: { ...s, ...next } });
  });

  r.delete('/saves/:id', requireUser, (req, res) => {
    db.prepare('DELETE FROM saves WHERE id = ?').run(ownSave(req).id);
    res.json({ ok: true });
  });

  // Import a data-export file from another app. Re-importing the same file
  // is safe: rows already imported (same source and key) are skipped.
  r.post('/saves/import', requireUser, (req, res) => {
    const { source, text } = req.body || {};
    if (!IMPORT_SOURCES.includes(source)) throw new HttpError(400, 'Unknown source');
    const rows = parseImport(source, text, { cities: cities() });
    const cache = loadCreatorCache(db);
    let added = 0;
    let untagged = 0;
    tx(db, () => {
      const ins = db.prepare(
        `INSERT OR IGNORE INTO saves (user_id, kind, title, creator, source, collection, url, note, city, tags, external_key, saved_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
      );
      for (const row of rows) {
        const tags = cleanTags(autoTag(row.title, row.creator, row.collection, row.note, cache));
        const kind = row.kind === 'other' ? guessKind(tags) : row.kind;
        const r2 = ins.run(req.user.id, kind, row.title, row.creator ?? null, source, row.collection ?? null, row.url ?? null, row.note ?? null, row.city ?? null, JSON.stringify(tags), String(row.external_key).slice(0, 500), row.saved_at ?? null);
        if (r2.changes) {
          added++;
          if (!tags.length) untagged++;
        }
      }
    });
    // Artists we don't know yet are looked up in the background; their saves fill in as answers arrive.
    const lookingUp = enricher.queue(rows.filter((x) => x.kind === 'song' && x.creator).map((x) => x.creator));
    res.json({ found: rows.length, added, skipped: rows.length - added, untagged, lookingUp });
  });

  // ----- You: your Tastemate character, your perfect day, your taste twin -----
  r.get('/you', requireUser, (req, res) => {
    const me = req.user.id;
    const cache = loadCreatorCache(db);
    const saves = interpret(getSaves(me), { cache });
    const profile = tasteProfile(saves);
    const clusters = findPatterns(saves);
    const city = homeCity(me);
    const dismissed = new Set(db.prepare('SELECT spot_id FROM spot_dismissals WHERE user_id = ?').all(me).map((x) => x.spot_id));
    const day = city && saves.length ? perfectDay({ profile, saves, spots: visibleSpots(me), city, exclude: dismissed }) : [];

    // Your taste twin: the friend whose saves read most like yours, and what you share.
    let twin = null;
    for (const id of friendIds(db, me)) {
      const theirs = tasteProfile(interpret(getSaves(id), { cache }));
      const match = toPercent(Math.max(0, cosine(profile, theirs)));
      if (!twin || match > twin.match) {
        const top = (p) => new Set([...p.entries()].filter(([k, v]) => v > 0 && !k.startsWith('creator:')).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k]) => k));
        const mine = top(profile);
        const u = db.prepare('SELECT username, display_name FROM users WHERE id = ?').get(id);
        twin = { ...u, match, shared: [...top(theirs)].filter((t) => mine.has(t)).slice(0, 3) };
      }
    }
    res.json({
      character: tasteCharacter(saves, clusters, profile),
      day,
      city,
      twin,
      total: saves.length,
      untagged: saves.filter((s) => !s.tags.length).length,
      lookingUp: enricher.pending(),
    });
  });

  // ----- Next: what to do, see and buy in a city, for a date range -----
  r.get('/next', requireUser, (req, res) => {
    const me = req.user.id;
    const known = cities();
    const asked = typeof req.query.city === 'string' ? req.query.city : null;
    const city = asked === 'anywhere' ? null : known.find((c) => c.toLowerCase() === (asked || homeCity(me) || '').toLowerCase()) || null;
    const today = new Date().toISOString().slice(0, 10);
    const from = ISO_DATE.test(req.query.from) ? req.query.from : today;
    const to = ISO_DATE.test(req.query.to) ? req.query.to : addDays(from, 14);
    if (to < from) throw new HttpError(400, 'The end date is before the start date');

    const saves = readSaves(me);
    const profile = tasteProfile(saves);
    const spots = visibleSpots(me);
    const savedSpots = new Set(saves.filter((s) => s.spot_id).map((s) => s.spot_id));
    const dismissed = db.prepare('SELECT spot_id FROM spot_dismissals WHERE user_id = ?').all(me).map((x) => x.spot_id);

    const fids = friendIds(db, me);
    const friendSaves = new Map();
    if (fids.length) {
      const rows = db
        .prepare(`SELECT s.spot_id, u.display_name FROM saves s JOIN users u ON u.id = s.user_id WHERE s.spot_id IS NOT NULL AND s.user_id IN (${fids.map(() => '?').join(',')})`)
        .all(...fids);
      for (const x of rows) friendSaves.set(x.spot_id, [...(friendSaves.get(x.spot_id) || []), x.display_name]);
    }

    const exclude = new Set([...savedSpots, ...dismissed]);
    const ranked = rankSpots({ profile, saves, spots, city, from, to, friendSaves, exclude, today });
    const group = (kind) => ranked.filter((x) => x.spot.kind === kind).slice(0, PER_KIND[kind]);
    const shown = new Set(['event', 'place', 'product'].flatMap((k) => group(k).map((x) => x.spot.id)));

    // Something a little different: spots for the tastes your saves hint at
    // but you haven't explored, so Next widens your world as well as matching it.
    const character = tasteCharacter(saves, findPatterns(saves), profile);
    const stretchTags = character?.stretch || [];
    const stretch = stretchTags.length
      ? rankSpots({ profile: new Map(stretchTags.map((t) => [t, 1])), saves, spots, city, from, to, exclude: new Set([...exclude, ...shown]), today })
          .slice(0, 4)
          .map((x) => {
            const tags = stretchTags.filter((t) => x.spot.tags.includes(t));
            return { ...x, reasons: [{ type: 'stretch', tags, why: tags.map((t) => character.stretchWhy[t]).filter(Boolean)[0] || null }, ...x.reasons.filter((r) => r.type !== 'saves' && r.type !== 'tags')] };
          })
      : [];
    res.json({
      city,
      homeCity: homeCity(me),
      from,
      to,
      cities: known,
      events: group('event'),
      places: group('place'),
      products: group('product'),
      stretch,
      // What you already saved there and may have forgotten about.
      canRefreshPosts: !!venueFeed,
      yourSaves: city ? saves.filter((s) => s.city?.toLowerCase() === city.toLowerCase() && !s.spot_id).map(({ signals, ...s }) => s) : [],
      saved: saves.filter((s) => s.spot_id && (!city || !s.city || s.city.toLowerCase() === city.toLowerCase())).map(({ signals, ...s }) => ({ ...s, spot: hydrateSpot(db.prepare('SELECT * FROM spots WHERE id = ?').get(s.spot_id)) })),
      profileSize: profile.size,
    });
  });

  const getSpot = (req) => {
    const s = hydrateSpot(db.prepare('SELECT * FROM spots WHERE id = ?').get(intParam(req.params.id)));
    if (!s || (s.added_by && s.added_by !== req.user.id && !friendIds(db, req.user.id).includes(s.added_by))) throw new HttpError(404, 'Spot not found');
    return s;
  };

  // ----- Events from posts -----

  // Read a pasted or shared post into a draft for the person to check.
  r.post('/spots/from-post', requireUser, (req, res) => {
    const text = String(req.body?.text || '').trim();
    if (!text) throw new HttpError(400, 'Paste the post text');
    res.json({ draft: parsePost(text, { url: cleanUrl(req.body.url), cities: cities() }) });
  });

  // Save the checked draft as an event, and into the person's plan.
  r.post('/spots', requireUser, (req, res) => {
    const b = req.body || {};
    const title = String(b.title || '').trim().slice(0, 120);
    const starts = String(b.starts_at || '');
    if (!title) throw new HttpError(400, 'Title is required');
    if (!/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(starts)) throw new HttpError(400, 'A date is required (YYYY-MM-DD)');
    const city = cleanCity(b.city);
    if (!city) throw new HttpError(400, 'City is required');
    const url = cleanUrl(b.url);
    const spot = upsertSpot(db, {
      kind: 'event',
      title,
      city,
      venue: cleanCity(b.venue),
      tags: cleanTags(b.tags?.length ? b.tags : autoTag(title, null, null, b.description)),
      description: b.description ? String(b.description).slice(0, 400) : null,
      starts_at: starts,
      ends_at: ISO_DATE.test(b.ends_at) ? b.ends_at : null,
      price: b.price ? String(b.price).slice(0, 40) : null,
      url,
      popularity: 0.2,
      source: 'post',
      external_id: `${req.user.id}:${url || `${title}|${starts}|${city}`}`,
      added_by: req.user.id,
    });
    db.prepare(
      `INSERT OR IGNORE INTO saves (user_id, kind, title, source, url, city, tags, spot_id, external_key)
       VALUES (?, 'event', ?, 'tastemate', ?,?,?,?,?)`
    ).run(req.user.id, spot.title, spot.url, spot.city, JSON.stringify(spot.tags), spot.id, `spot:${spot.id}`);
    res.status(201).json({ spot });
  });

  // Pull new event posts from followed venue accounts (providers/venue-posts.js).
  r.post('/spots/refresh-posts', requireUser, ah(async (_req, res) => {
    if (!venueFeed) throw new HttpError(400, 'No venue feed configured. Set IG_USER_ID, IG_ACCESS_TOKEN and VENUE_ACCOUNTS.');
    const { posts, errors } = await venueFeed.fetchPosts();
    const today = new Date().toISOString().slice(0, 10);
    let added = 0;
    for (const post of posts) {
      const d = parsePost(post.text, { url: post.url, cities: cities(), city: post.city, venue: post.venue });
      // Only posts that announce a dated, upcoming event we can tag.
      if (!d.starts_at || d.starts_at.slice(0, 10) < today || !d.tags.length || !d.city) continue;
      const before = db.prepare(`SELECT 1 FROM spots WHERE source = 'venue_post' AND external_id = ?`).get(post.url);
      upsertSpot(db, { ...d, popularity: 0.25, source: 'venue_post', external_id: post.url });
      if (!before) added++;
    }
    res.json({ posts: posts.length, added, errors });
  }));

  // ----- Occasions: a whole evening from your taste -----
  r.get('/occasion', requireUser, (req, res) => {
    const me = req.user.id;
    const saves = readSaves(me);
    const profile = tasteProfile(saves);
    const city = homeCity(me);
    const shop = visibleSpots(me).filter((x) => x.kind !== 'event' && (!x.city || !city || x.city.toLowerCase() === city.toLowerCase()));
    const theme = req.query.theme != null && req.query.theme !== '' ? Number(req.query.theme) : null;
    res.json({
      ...planOccasion({ type: OCCASIONS[req.query.type] ? req.query.type : 'dinner', clusters: findPatterns(saves), theme, profile, saves, shop }),
      city,
    });
  });

  // Saving a spot makes it a save like any other, so it feeds the graph too.
  r.post('/spots/:id/save', requireUser, (req, res) => {
    const spot = getSpot(req);
    db.prepare(
      `INSERT OR IGNORE INTO saves (user_id, kind, title, creator, source, url, city, tags, spot_id, external_key)
       VALUES (?,?,?,?, 'tastemate', ?,?,?,?,?)`
    ).run(req.user.id, spot.kind, spot.title, spot.creators[0] ?? null, spot.url, spot.city, JSON.stringify(spot.tags), spot.id, `spot:${spot.id}`);
    db.prepare('DELETE FROM spot_dismissals WHERE user_id = ? AND spot_id = ?').run(req.user.id, spot.id);
    res.json({ ok: true });
  });

  r.delete('/spots/:id/save', requireUser, (req, res) => {
    db.prepare('DELETE FROM saves WHERE user_id = ? AND spot_id = ?').run(req.user.id, getSpot(req).id);
    res.json({ ok: true });
  });

  r.post('/spots/:id/dismiss', requireUser, (req, res) => {
    const spot = getSpot(req);
    db.prepare('INSERT OR IGNORE INTO spot_dismissals (user_id, spot_id) VALUES (?,?)').run(req.user.id, spot.id);
    res.json({ ok: true });
  });

  r.put('/settings', requireUser, (req, res) => {
    const home = cleanCity(req.body?.home_city);
    db.prepare('UPDATE users SET home_city = ? WHERE id = ?').run(home, req.user.id);
    res.json({ home_city: home });
  });
}

/** Signals grouped by facet, firm ones first: { sound: [{ tag, tier, via }], place: [...] }. */
function breakdown(signals) {
  const rank = { obvious: 0, translated: 1, possible: 2 };
  const out = {};
  for (const x of [...signals].sort((a, b) => rank[a.tier] - rank[b.tier])) {
    (out[x.facet] ||= []).push({ tag: x.tag, tier: x.tier, via: x.via });
  }
  return out;
}

function cleanUrl(u) {
  const s = String(u || '').trim();
  return /^https?:\/\/\S+$/i.test(s) ? s.slice(0, 500) : null;
}

function cleanCity(c) {
  const s = String(c || '').trim().slice(0, 80);
  return s || null;
}

function addDays(iso, n) {
  return new Date(Date.parse(iso) + n * 864e5).toISOString().slice(0, 10);
}
