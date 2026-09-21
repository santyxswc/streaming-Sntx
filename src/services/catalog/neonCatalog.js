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

function getUpsertMediaItemQuery(sql, item) {
  const mt = item.type === "series" ? "series" : "movie";
  const scraped = item.scrapedAt ? new Date(item.scrapedAt) : new Date();
  const genres = Array.isArray(item.genres) ? item.genres : [];
  return sql`
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

export const saveMediaBatch = async (items) => {
  if (!items || !items.length) return;
  const sql = getNeonSql();
  const CHUNK_SIZE = 50;
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);
    await sql.begin((trx) => chunk.map((item) => getUpsertMediaItemQuery(trx, item)));
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

  // Pre-filtra en SQL usando los términos de búsqueda en vez de transferir toda la tabla
  const conditions = searchWords.map((w) => {
    const norm = normalizeForSearch(w);
    const pat1 = `%${w}%`;
    const pat2 = `%${norm}%`;
    if (w === norm) {
      return sql`(title ILIKE ${pat1} OR original_title ILIKE ${pat1} OR overview ILIKE ${pat1} OR id ILIKE ${pat1})`;
    }
    return sql`(title ILIKE ${pat1} OR original_title ILIKE ${pat1} OR overview ILIKE ${pat1} OR id ILIKE ${pat1} OR title ILIKE ${pat2} OR original_title ILIKE ${pat2} OR overview ILIKE ${pat2} OR id ILIKE ${pat2})`;
  });

  const whereClause = conditions.reduce((acc, cond) => sql`${acc} AND ${cond}`);
  const phrase = qStr.toLowerCase().trim();
  const phrasePattern = `%${phrase}%`;
  // Sin ORDER BY, un LIMIT bajo podría cortar antes de llegar a las mejores
  // coincidencias en búsquedas con muchos resultados (términos comunes).
  // Priorizamos en SQL las filas que ya contienen la frase completa (título
  // más corto primero, más probable que sea el match exacto) para que
  // sobrevivan al LIMIT incluso si hay cientos de coincidencias parciales.
  const rows = await sql`
    SELECT id, title, original_title, overview
    FROM media
    WHERE ${whereClause}
    ORDER BY
      (title ILIKE ${phrasePattern} OR original_title ILIKE ${phrasePattern}) DESC,
      LENGTH(COALESCE(title, '')) ASC
    LIMIT 400
  `;

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
  const validTitles = (titlesToTry || []).filter(Boolean);
  if (!validTitles.length) return { winner: null, winnerId: null };

  const slugs = validTitles.map((t) =>
    t
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ /g, "-")
      .replace(/[^\w-]/g, "")
  ).filter(Boolean);

  // 1. Comprobar por slug directo en una sola consulta
  if (slugs.length) {
    const bySlug = await sql`
      SELECT * FROM media
      WHERE media_type = ${mediaType} AND id = ANY(${slugs})
    `;
    if (bySlug.length) {
      for (const s of slugs) {
        const match = bySlug.find((r) => r.id === s);
        if (match) return { winner: rowToItem(match), winnerId: match.id };
      }
    }
  }

  // 2. Comprobar por título exacto u original_title en una sola consulta
  const byTitles = await sql`
    SELECT * FROM media
    WHERE media_type = ${mediaType}
      AND (title = ANY(${validTitles}) OR original_title = ANY(${validTitles}))
  `;
  if (byTitles.length) {
    for (const title of validTitles) {
      const matchTitle = byTitles.find((r) => r.title === title);
      if (matchTitle) return { winner: rowToItem(matchTitle), winnerId: matchTitle.id };
      const matchOrig = byTitles.find((r) => r.original_title === title);
      if (matchOrig) return { winner: rowToItem(matchOrig), winnerId: matchOrig.id };
    }
  }

  return { winner: null, winnerId: null };
};
