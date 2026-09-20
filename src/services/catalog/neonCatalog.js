import { getNeonSql } from "@/lib/neonSql";

function rowToItem(row) {
  if (!row) return null;
  const scraped = row.scraped_at;
  const payload = row.payload && typeof row.payload === "object" ? row.payload : {};
  const numericFromPayload =
    payload.numericId ?? payload.numeric_id ?? payload._id ?? null;
  let numericId = null;
  if (row.numeric_id != null && row.numeric_id !== "") {
    const n = Number(row.numeric_id);
    if (Number.isFinite(n) && n > 0) numericId = n;
  }
  if (numericId == null && numericFromPayload != null && numericFromPayload !== "") {
    const n = Number(numericFromPayload);
    if (Number.isFinite(n) && n > 0) numericId = n;
  }
  return {
    id: row.id,
    numericId,
    title: row.title,
    originalTitle: row.original_title,
    overview: row.overview,
    href: row.href,
    image: row.image,
    backdrop: row.backdrop,
    year: row.year,
    rating: row.rating,
    genres: Array.isArray(row.genres) ? row.genres : [],
    country: row.country,
    trailer: row.trailer,
    type: row.media_type === "series" ? "series" : "movie",
    scrapedAt: scraped instanceof Date ? scraped.toISOString() : scraped,
  };
}

export const saveMediaBatch = async (items) => {
  const sql = getNeonSql();
  for (const item of items) {
    const mt = item.type === "series" ? "series" : "movie";
    const scraped = item.scrapedAt ? new Date(item.scrapedAt) : new Date();
    const genres = Array.isArray(item.genres) ? item.genres : [];
    await sql`
      INSERT INTO media (
        id, media_type, title, original_title, overview, href, image, backdrop,
        year, rating, genres, country, trailer, numeric_id, scraped_at, payload
      ) VALUES (
        ${item.id},
        ${mt},
        ${item.title ?? null},
        ${item.originalTitle ?? null},
        ${item.overview ?? null},
        ${item.href ?? null},
        ${item.image ?? null},
        ${item.backdrop ?? null},
        ${item.year != null ? String(item.year) : null},
        ${item.rating ?? null},
        ${genres},
        ${item.country ?? null},
        ${item.trailer ?? null},
        ${item.numericId != null ? Number(item.numericId) : null},
        ${scraped},
        ${item}
      )
      ON CONFLICT (id) DO UPDATE SET
        media_type = EXCLUDED.media_type,
        title = EXCLUDED.title,
        original_title = EXCLUDED.original_title,
        overview = EXCLUDED.overview,
        href = EXCLUDED.href,
        image = EXCLUDED.image,
        backdrop = EXCLUDED.backdrop,
        year = EXCLUDED.year,
        rating = EXCLUDED.rating,
        genres = EXCLUDED.genres,
        country = EXCLUDED.country,
        trailer = EXCLUDED.trailer,
        numeric_id = EXCLUDED.numeric_id,
        scraped_at = EXCLUDED.scraped_at,
        payload = EXCLUDED.payload
    `;
  }
};

export const getMediaSorted = async (
  type = "movie",
  sortField = "scrapedAt",
  sortOrder = "desc",
  count = 20,
  lastDocId = null,
  genre = null,
  year = null,
  country = null
) => {
  const sql = getNeonSql();
  const mediaType =
    type === "series" || type === "tvshows" || type === "anime" ? "series" : "movie";
  const desc = sortOrder !== "asc";

  let cursor = null;
  if (lastDocId) {
    const rows = await sql`
      SELECT scraped_at, id, year, rating FROM media WHERE id = ${lastDocId} AND media_type = ${mediaType}
    `;
    cursor = rows[0] || null;
    if (cursor && (sortField === "yearRating" || sortField === "rating")) {
      cursor.ratingNum =
        parseFloat(String(cursor.rating || "").replace(/[^0-9.]/g, "")) || 0;
    }
  }

  const hasGenre = genre && genre !== "Todos";
  const hasYear = year && year !== "Todos" && year !== "";
  const hasCountry = country && country !== "Todos";

  if (sortField === "year") {
    const rows = await (desc
      ? sql`
        SELECT * FROM media
        WHERE media_type = ${mediaType}
        ${hasGenre ? sql`AND ${genre} = ANY(genres)` : sql``}
        ${hasYear ? sql`AND year = ${String(year)}` : sql``}
        ${hasCountry ? sql`AND country = ${country}` : sql``}
        ${cursor
          ? sql`AND (coalesce(year::text, ''), id) < (${String(cursor.year ?? "")}, ${cursor.id})`
          : sql``}
        ORDER BY year DESC NULLS LAST, id DESC
        LIMIT ${count}
      `
      : sql`
        SELECT * FROM media
        WHERE media_type = ${mediaType}
        ${hasGenre ? sql`AND ${genre} = ANY(genres)` : sql``}
        ${hasYear ? sql`AND year = ${String(year)}` : sql``}
        ${hasCountry ? sql`AND country = ${country}` : sql``}
        ${cursor
          ? sql`AND (coalesce(year::text, ''), id) > (${String(cursor.year ?? "")}, ${cursor.id})`
          : sql``}
        ORDER BY year ASC NULLS LAST, id ASC
        LIMIT ${count}
      `);
    return rows.map(rowToItem);
  }

  /** Aclamadas por la crítica: primero últimos años, luego por rating IMDb. */
  if (sortField === "yearRating") {
    const rows = await (desc
      ? sql`
        SELECT * FROM media
        WHERE media_type = ${mediaType}
        ${hasGenre ? sql`AND ${genre} = ANY(genres)` : sql``}
        ${hasYear ? sql`AND year = ${String(year)}` : sql``}
        ${hasCountry ? sql`AND country = ${country}` : sql``}
        ${cursor
          ? sql`AND (
            (coalesce(year::text, '0'), coalesce(NULLIF(regexp_replace(rating, '[^0-9.]', '', 'g'), '')::numeric, 0), id) <
            (${String(cursor.year ?? "0")}, ${cursor.ratingNum ?? 0}, ${cursor.id})
          )`
          : sql``}
        ORDER BY
          coalesce(year::text, '0') DESC,
          coalesce(NULLIF(regexp_replace(rating, '[^0-9.]', '', 'g'), '')::numeric, 0) DESC NULLS LAST,
          id DESC
        LIMIT ${count}
      `
      : sql`
        SELECT * FROM media
        WHERE media_type = ${mediaType}
        ${hasGenre ? sql`AND ${genre} = ANY(genres)` : sql``}
        ${hasYear ? sql`AND year = ${String(year)}` : sql``}
        ${hasCountry ? sql`AND country = ${country}` : sql``}
        ${cursor
          ? sql`AND (
            (coalesce(year::text, '0'), coalesce(NULLIF(regexp_replace(rating, '[^0-9.]', '', 'g'), '')::numeric, 0), id) >
            (${String(cursor.year ?? "0")}, ${cursor.ratingNum ?? 0}, ${cursor.id})
          )`
          : sql``}
        ORDER BY
          coalesce(year::text, '0') ASC,
          coalesce(NULLIF(regexp_replace(rating, '[^0-9.]', '', 'g'), '')::numeric, 0) ASC NULLS LAST,
          id ASC
        LIMIT ${count}
      `);
    return rows.map(rowToItem);
  }

  /** Series populares: orden por rating IMDb (más puntuadas primero). */
  if (sortField === "rating") {
    const rows = await (desc
      ? sql`
        SELECT * FROM media
        WHERE media_type = ${mediaType}
        ${hasGenre ? sql`AND ${genre} = ANY(genres)` : sql``}
        ${hasYear ? sql`AND year = ${String(year)}` : sql``}
        ${hasCountry ? sql`AND country = ${country}` : sql``}
        ${cursor
          ? sql`AND (
            (coalesce(NULLIF(regexp_replace(rating, '[^0-9.]', '', 'g'), '')::numeric, 0), id) <
            (${cursor.ratingNum ?? 0}, ${cursor.id})
          )`
          : sql``}
        ORDER BY
          coalesce(NULLIF(regexp_replace(rating, '[^0-9.]', '', 'g'), '')::numeric, 0) DESC NULLS LAST,
          id DESC
        LIMIT ${count}
      `
      : sql`
        SELECT * FROM media
        WHERE media_type = ${mediaType}
        ${hasGenre ? sql`AND ${genre} = ANY(genres)` : sql``}
        ${hasYear ? sql`AND year = ${String(year)}` : sql``}
        ${hasCountry ? sql`AND country = ${country}` : sql``}
        ${cursor
          ? sql`AND (
            (coalesce(NULLIF(regexp_replace(rating, '[^0-9.]', '', 'g'), '')::numeric, 0), id) >
            (${cursor.ratingNum ?? 0}, ${cursor.id})
          )`
          : sql``}
        ORDER BY
          coalesce(NULLIF(regexp_replace(rating, '[^0-9.]', '', 'g'), '')::numeric, 0) ASC NULLS LAST,
          id ASC
        LIMIT ${count}
      `);
    return rows.map(rowToItem);
  }

  const rows = await (desc
    ? sql`
      SELECT * FROM media
      WHERE media_type = ${mediaType}
      ${hasGenre ? sql`AND ${genre} = ANY(genres)` : sql``}
      ${hasYear ? sql`AND year = ${String(year)}` : sql``}
      ${hasCountry ? sql`AND country = ${country}` : sql``}
      ${cursor
        ? sql`AND (scraped_at < ${cursor.scraped_at} OR (scraped_at = ${cursor.scraped_at} AND id < ${cursor.id}))`
        : sql``}
      ORDER BY scraped_at DESC, id DESC
      LIMIT ${count}
    `
    : sql`
      SELECT * FROM media
      WHERE media_type = ${mediaType}
      ${hasGenre ? sql`AND ${genre} = ANY(genres)` : sql``}
      ${hasYear ? sql`AND year = ${String(year)}` : sql``}
      ${hasCountry ? sql`AND country = ${country}` : sql``}
      ${cursor
        ? sql`AND (scraped_at > ${cursor.scraped_at} OR (scraped_at = ${cursor.scraped_at} AND id > ${cursor.id}))`
        : sql``}
      ORDER BY scraped_at ASC, id ASC
      LIMIT ${count}
    `);

  return rows.map(rowToItem);
};

export const getLatestMedia = async (type = "movie", count = 20) => {
  return getMediaSorted(type, "scrapedAt", "desc", count);
};

export const getFilterMetadata = async (type) => {
  const sql = getNeonSql();
  const mediaType = type === "series" || type === "tvshows" || type === "anime" ? "series" : "movie";
  const key = mediaType === "series" ? "series" : "movies";

  const [metaRow, genreRows, fallbackYears] = await Promise.all([
    sql`SELECT years, countries FROM catalog_metadata WHERE facet_key = ${key}`,
    sql`
      SELECT DISTINCT unnest(genres) as g
      FROM media
      WHERE media_type = ${mediaType} AND array_length(genres, 1) > 0
      ORDER BY 1
    `,
    sql`
      SELECT year FROM media
      WHERE media_type = ${mediaType} AND year IS NOT NULL AND year != '' AND year ~ '^[0-9]{4}$'
      GROUP BY year
      ORDER BY year DESC
    `,
  ]);

  const r = metaRow[0];
  let years = r?.years;
  if (!Array.isArray(years) || years.length <= 1) {
    const fy = fallbackYears?.map((row) => row.year).filter(Boolean);
    years = fy?.length ? ["Todos", ...fy] : ["Todos"];
  }
  const countries =
    r && Array.isArray(r.countries) && r.countries.length ? r.countries : ["Todos"];
  const genres = genreRows.length
    ? ["Todos", ...genreRows.map((row) => row.g).filter(Boolean)]
    : ["Todos"];

  return { years, countries, genres };
};

export const updateFilterMetadata = async (type, items) => {
  if (!items.length) return;
  const sql = getNeonSql();
  const key = type === "series" ? "series" : "movies";
  const rows = await sql`
    SELECT years, countries FROM catalog_metadata WHERE facet_key = ${key}
  `;
  const existing = rows[0] || { years: [], countries: [] };
  const newYears = new Set(existing.years || []);
  const newCountries = new Set(existing.countries || []);
  items.forEach((item) => {
    if (item.year) newYears.add(String(item.year));
    if (item.country && item.country !== "N/A") newCountries.add(String(item.country));
  });
  const years = [
    "Todos",
    ...[...newYears].filter((y) => y && y !== "Todos").sort((a, b) => Number(b) - Number(a)),
  ];
  const countries = [
    "Todos",
    ...[...newCountries].filter((c) => c && c !== "Todos").sort(),
  ];
  await sql`
    INSERT INTO catalog_metadata (facet_key, years, countries, updated_at)
    VALUES (${key}, ${years}, ${countries}, now())
    ON CONFLICT (facet_key) DO UPDATE SET
      years = EXCLUDED.years,
      countries = EXCLUDED.countries,
      updated_at = now()
  `;
};

export const getMediaBySlug = async (type, slug) => {
  const sql = getNeonSql();
  const mediaType =
    type === "series" || type === "tvshows" || type === "anime" || type === "animes"
      ? "series"
      : "movie";
  const rows = await sql`
    SELECT * FROM media WHERE id = ${slug} AND media_type = ${mediaType} LIMIT 1
  `;
  if (!rows.length) return null;
  return rowToItem(rows[0]);
};

/** Escapa caracteres especiales de regex para búsqueda segura. */
function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Normaliza texto: quita acentos para búsqueda más tolerante (café = cafe). */
function normalizeForSearch(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Búsqueda por palabras con límites de palabra (word boundaries).
 * Incluye slug (id) y normaliza acentos para encontrar "Juego de tronos" o "Game of Thrones".
 * Ordena por relevancia: título exacto > palabras en título > overview.
 */
export const searchCatalog = async (qStr) => {
  const sql = getNeonSql();
  const searchWords = qStr
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 0);
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

  // Solo columnas de texto para puntuar: evita transferir `payload` (JSON pesado
  // con la respuesta completa de TMDB/TVmaze) de las ~100k filas en cada tecleo.
  const rows = await sql`SELECT id, title, original_title, overview FROM media`;
  const phrase = qStr.toLowerCase().trim();

  const scored = rows
    .map((item) => {
      const title = (item.title || "").toLowerCase();
      const originalTitle = (item.original_title || "").toLowerCase();
      const overview = (item.overview || "").toLowerCase();
      const slugAsText = (item.id || "").replace(/-/g, " ").toLowerCase();
      const combinedText = `${title} ${originalTitle} ${overview} ${slugAsText}`;
      const combinedNorm = normalizeForSearch(combinedText);

      const matches =
        wordPatterns.every((re) => re.test(combinedText)) ||
        normWordPatterns.every((re) => re.test(combinedNorm));

      if (!matches) return null;

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
      return { item, score };
    })
    .filter((x) => x !== null)
    .sort((a, b) => b.score - a.score);

  const top = scored.slice(0, 30);
  if (top.length === 0) return [];

  // Hidrata solo las filas ganadoras con todas las columnas (imagen, payload, etc.)
  const ids = top.map(({ item }) => item.id);
  const fullRows = await sql`SELECT * FROM media WHERE id = ANY(${ids})`;
  const byId = new Map(fullRows.map((row) => [row.id, row]));
  return top
    .map(({ item }) => byId.get(item.id))
    .filter(Boolean)
    .map(rowToItem);
};

/** Registra una visita (solo Neon). Usado desde DetailClient. */
export const recordMediaView = async (mediaId) => {
  if (!mediaId) return;
  const sql = getNeonSql();
  try {
    await sql`INSERT INTO media_views (media_id) VALUES (${mediaId})`;
  } catch (err) {
    console.error("[neonCatalog] recordMediaView:", err.message);
  }
};

/** Tendencias: más vistos en Luvana + estrenos 2025/2026 populares como fallback. */
export const getTrendingMedia = async (count = 60) => {
  const sql = getNeonSql();
  const TRENDING_DAYS = 30;
  const since = new Date();
  since.setDate(since.getDate() - TRENDING_DAYS);

  const byViews = await sql`
    SELECT m.*
    FROM media m
    INNER JOIN (
      SELECT media_id, COUNT(*) as cnt
      FROM media_views
      WHERE viewed_at >= ${since}
      GROUP BY media_id
      ORDER BY cnt DESC
      LIMIT ${Math.ceil(count * 0.6)}
    ) v ON m.id = v.media_id
    ORDER BY v.cnt DESC
  `;

  const seenIds = new Set(byViews.map((r) => r.id));
  const need = count - byViews.length;

  let fallback = [];
  if (need > 0) {
    const excludeIds = Array.from(seenIds);
    const fallbackRows = excludeIds.length
      ? await sql`
          SELECT * FROM media
          WHERE year IN ('2025', '2026') AND id NOT IN ${sql(excludeIds)}
          ORDER BY (
            CASE WHEN rating ~ '^[0-9.]+$' THEN (rating::numeric) ELSE 0 END
          ) DESC NULLS LAST, scraped_at DESC
          LIMIT ${need}
        `
      : await sql`
          SELECT * FROM media
          WHERE year IN ('2025', '2026')
          ORDER BY (
            CASE WHEN rating ~ '^[0-9.]+$' THEN (rating::numeric) ELSE 0 END
          ) DESC NULLS LAST, scraped_at DESC
          LIMIT ${need}
        `;
    fallback = fallbackRows;
  }

  const combined = [...byViews.map(rowToItem), ...fallback.map(rowToItem)];
  return combined.slice(0, count);
};

export const getRecommendationsForItem = async (item, count = 60) => {
  if (!item) return [];
  const sql = getNeonSql();
  const mediaType = item.type === "series" ? "series" : "movie";
  const rows = await sql`
    SELECT * FROM media
    WHERE media_type = ${mediaType}
    ORDER BY scraped_at DESC
    LIMIT ${count + 1}
  `;
  return rows
    .map(rowToItem)
    .filter((f) => f.id !== item.id)
    .slice(0, count);
};

/** Fase IA: slug directo + búsqueda exacta por title / original_title */
export const findMediaForAiLookup = async (collectionName, titlesToTry) => {
  const sql = getNeonSql();
  const mediaType = collectionName === "series" ? "series" : "movie";

  for (const title of titlesToTry) {
    if (!title) continue;
    const slug = title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ /g, "-")
      .replace(/[^\w-]/g, "");
    const bySlug = await sql`
      SELECT * FROM media WHERE id = ${slug} AND media_type = ${mediaType} LIMIT 1
    `;
    if (bySlug.length) {
      return { winner: rowToItem(bySlug[0]), winnerId: bySlug[0].id };
    }
  }

  for (const title of titlesToTry) {
    if (!title) continue;
    const exactTitle = await sql`
      SELECT * FROM media
      WHERE media_type = ${mediaType} AND title = ${title}
      LIMIT 1
    `;
    if (exactTitle.length) {
      return { winner: rowToItem(exactTitle[0]), winnerId: exactTitle[0].id };
    }
    const exactOrig = await sql`
      SELECT * FROM media
      WHERE media_type = ${mediaType} AND original_title = ${title}
      LIMIT 1
    `;
    if (exactOrig.length) {
      return { winner: rowToItem(exactOrig[0]), winnerId: exactOrig[0].id };
    }
  }

  return { winner: null, winnerId: null };
};
