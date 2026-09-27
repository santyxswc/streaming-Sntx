import 'server-only';
import { getAdminFirestore } from "@/server/db/firebaseAdmin";

/** Firestore Admin para operaciones de catálogo en el servidor (bypasea reglas). */
function getCatalogDb() {
  return getAdminFirestore();
}

const METADATA_DOC = { collection: 'metadata', id: 'filters' };

const BATCH_SIZE = 450;

export const saveMediaBatch = async (items) => {
  const adminDb = getCatalogDb();
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const chunk = items.slice(i, i + BATCH_SIZE);
    const batch = adminDb.batch();
    for (const item of chunk) {
      const collectionName = item.type === 'series' ? 'series' : 'movies';
      const ref = adminDb.collection(collectionName).doc(item.id);
      batch.set(ref, item, { merge: true });
    }
    await batch.commit();
  }
};

export const getMediaSorted = async (type = 'movie', sortField = 'scrapedAt', sortOrder = 'desc', count = 20, lastDocId = null, genre = null, year = null, country = null) => {
  const adminDb = getCatalogDb();
  let collectionName = (type === 'series' || type === 'tvshows' || type === 'anime') ? 'series' : 'movies';
  let q = adminDb.collection(collectionName);

  if (genre && genre !== 'Todos') q = q.where('genres', 'array-contains', genre);
  if (year && year !== 'Todos' && year !== '') q = q.where('year', '==', String(year));
  if (country && country !== 'Todos') q = q.where('country', '==', country);

  if (sortField === 'yearRating') {
    q = q.orderBy('year', 'desc').orderBy('rating', 'desc').orderBy('id', sortOrder === 'asc' ? 'asc' : 'desc');
  } else if (sortField === 'rating') {
    q = q.orderBy('rating', 'desc').orderBy('id', sortOrder === 'asc' ? 'asc' : 'desc');
  } else {
    q = q.orderBy(sortField, sortOrder).orderBy('id', sortOrder);
  }

  if (lastDocId) {
    const lastRef = adminDb.collection(collectionName).doc(lastDocId);
    const lastSnap = await lastRef.get();
    if (lastSnap.exists) q = q.startAfter(lastSnap);
  }
  q = q.limit(count);

  const snapshot = await q.get();
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getLatestMedia = async (type = 'movie', count = 20) => {
  return getMediaSorted(type, 'scrapedAt', 'desc', count);
};

export const getFilterMetadata = async (type) => {
  const adminDb = getCatalogDb();
  const docRef = adminDb.collection(METADATA_DOC.collection).doc(METADATA_DOC.id);
  const snap = await docRef.get();
  const key = type === 'series' ? 'series' : 'movies';
  const data = snap.exists ? snap.data()[key] : null;
  return data || { years: ['Todos'], countries: ['Todos'] };
};

export const updateFilterMetadata = async (type, items) => {
  if (!items.length) return;
  const adminDb = getCatalogDb();
  const docRef = adminDb.collection(METADATA_DOC.collection).doc(METADATA_DOC.id);
  const snap = await docRef.get();
  const current = snap.exists ? snap.data() : {};
  const key = type === 'series' ? 'series' : 'movies';
  const existing = current[key] || { years: [], countries: [] };
  const newYears = new Set(existing.years || []);
  const newCountries = new Set(existing.countries || []);
  items.forEach(item => {
    if (item.year) newYears.add(String(item.year));
    if (item.country && item.country !== 'N/A') newCountries.add(String(item.country));
  });
  const years = ['Todos', ...[...newYears].filter(y => y && y !== 'Todos').sort((a, b) => Number(b) - Number(a))];
  const countries = ['Todos', ...[...newCountries].filter(c => c && c !== 'Todos').sort()];
  await docRef.set({ ...current, [key]: { years, countries } }, { merge: true });
};

export const getMediaBySlug = async (type, slug) => {
  const adminDb = getCatalogDb();
  let collectionName = 'movies';
  if (type === 'series' || type === 'tvshows') collectionName = 'series';
  if (type === 'anime' || type === 'animes') collectionName = 'series';

  const snapshot = await adminDb.collection(collectionName).where('id', '==', slug).limit(1).get();
  if (snapshot.empty) return null;
  const d = snapshot.docs[0];
  return { id: d.id, ...d.data() };
};

// Firestore limita los filtros `in` a 30 valores por consulta.
const IN_QUERY_LIMIT = 30;

export const getMediaByIds = async (type, ids) => {
  if (!ids?.length) return [];
  const adminDb = getCatalogDb();
  const collectionName = type === 'series' ? 'series' : 'movies';
  const chunks = [];
  for (let i = 0; i < ids.length; i += IN_QUERY_LIMIT) {
    chunks.push(ids.slice(i, i + IN_QUERY_LIMIT));
  }
  const snapshots = await Promise.all(
    chunks.map((chunk) => adminDb.collection(collectionName).where('id', 'in', chunk).get())
  );
  return snapshots.flatMap((snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() })));
};

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeForSearch(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export const searchCatalog = async (qStr) => {
  const adminDb = getCatalogDb();
  const searchWords = qStr
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 0);
  if (searchWords.length === 0) return [];

  const normSearch = normalizeForSearch(qStr);
  const wordPatterns = searchWords.map((w) => {
    const escaped = escapeRegex(w);
    return new RegExp(`\\b${escaped}\\b`, "i");
  });
  const normWordPatterns = searchWords.map((w) => {
    const norm = normalizeForSearch(w);
    const escaped = escapeRegex(norm);
    return new RegExp(`\\b${escaped}\\b`, "i");
  });

  const phrase = qStr.toLowerCase().trim();
  const scored = [];

  const snapshots = await Promise.all([
    adminDb.collection("movies").get(),
    adminDb.collection("series").get(),
  ]);

  for (const snapshot of snapshots) {
    const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

    for (const item of items) {
      const title = item.title?.toLowerCase() || "";
      const originalTitle = item.originalTitle?.toLowerCase() || "";
      const overview = item.overview?.toLowerCase() || "";
      const slugAsText = (item.id || "").replace(/-/g, " ").toLowerCase();
      const combinedText = `${title} ${originalTitle} ${overview} ${slugAsText}`;
      const combinedNorm = normalizeForSearch(combinedText);

      const matches =
        wordPatterns.every((re) => re.test(combinedText)) ||
        normWordPatterns.every((re) => re.test(combinedNorm));

      if (!matches) continue;

      let score = 0;
      if (title.includes(phrase) || originalTitle.includes(phrase)) score += 100;
      if (
        normalizeForSearch(title).includes(normSearch) ||
        normalizeForSearch(originalTitle).includes(normSearch)
      )
        score += 100;
      if (slugAsText.includes(phrase) || normalizeForSearch(slugAsText).includes(normSearch))
        score += 80;
      for (let i = 0; i < wordPatterns.length; i++) {
        if (wordPatterns[i].test(title) || normWordPatterns[i].test(normalizeForSearch(title)))
          score += 20;
        else if (
          wordPatterns[i].test(originalTitle) ||
          normWordPatterns[i].test(normalizeForSearch(originalTitle))
        )
          score += 15;
        else if (
          wordPatterns[i].test(slugAsText) ||
          normWordPatterns[i].test(normalizeForSearch(slugAsText))
        )
          score += 12;
        else if (
          wordPatterns[i].test(overview) ||
          normWordPatterns[i].test(normalizeForSearch(overview))
        )
          score += 5;
      }
      scored.push({ item, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 30).map(({ item }) => item);
};

export const getRecommendationsForItem = async (item, count = 60) => {
  if (!item) return [];
  const adminDb = getCatalogDb();
  const collectionName = item.type === 'series' ? 'series' : 'movies';
  const snapshot = await adminDb
    .collection(collectionName)
    .orderBy('scrapedAt', 'desc')
    .limit(count + 1)
    .get();
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((f) => f.id !== item.id)
    .slice(0, count);
};

export const findMediaForAiLookup = async (collectionName, titlesToTry) => {
  const adminDb = getCatalogDb();
  const col = adminDb.collection(collectionName);
  const validTitles = (titlesToTry || []).filter(Boolean);
  if (!validTitles.length) return { winner: null, winnerId: null };

  const slugEntries = validTitles.map((title) => {
    const slug = title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ /g, "-")
      .replace(/[^\w-]/g, "");
    return { title, slug };
  });

  // 1. Consultar todos los slugs en paralelo
  const slugDocs = await Promise.all(
    slugEntries.map(({ slug }) => col.doc(slug).get())
  );
  for (let i = 0; i < slugDocs.length; i++) {
    const docSnap = slugDocs[i];
    if (docSnap.exists) {
      return { winner: docSnap.data(), winnerId: docSnap.id };
    }
  }

  // 2. Búsqueda por title / originalTitle
  for (const title of validTitles) {
    const [q1, q2] = await Promise.all([
      col.where("title", "==", title).limit(1).get(),
      col.where("originalTitle", "==", title).limit(1).get(),
    ]);
    if (!q1.empty) {
      const d = q1.docs[0];
      return { winner: d.data(), winnerId: d.id };
    }
    if (!q2.empty) {
      const d = q2.docs[0];
      return { winner: d.data(), winnerId: d.id };
    }
  }

  return { winner: null, winnerId: null };
};
