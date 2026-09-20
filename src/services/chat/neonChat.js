import { getNeonSql } from '@/lib/neonSql';

function rowToMessage(row) {
  if (!row) return null;
  return {
    id: row.id,
    mediaId: row.media_id,
    episodeKey: row.episode_key,
    authorUid: row.author_uid,
    authorDisplayName: row.author_display_name,
    body: row.body,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : row.created_at,
  };
}

/**
 * @param {string} mediaId
 * @returns {Promise<boolean>}
 */
export async function mediaExists(mediaId) {
  const sql = getNeonSql();
  const rows = await sql`SELECT 1 AS x FROM media WHERE id = ${mediaId} LIMIT 1`;
  return rows.length > 0;
}

/**
 * @param {object} opts
 * @param {string} opts.mediaId
 * @param {string|null|undefined} opts.episodeKey
 * @param {string|null|undefined} opts.afterId - UUID del último mensaje conocido (polling incremental)
 * @param {number} [opts.limit]
 */
export async function listMessages({
  mediaId,
  episodeKey = null,
  afterId = null,
  limit = 50,
}) {
  const sql = getNeonSql();
  const ep = episodeKey ?? null;
  const lim = Math.min(Math.max(Number(limit) || 50, 1), 100);

  if (afterId) {
    const anchor = await sql`
      SELECT created_at, id FROM chat_messages
      WHERE id = ${afterId}::uuid
        AND media_id = ${mediaId}
        AND (episode_key IS NOT DISTINCT FROM ${ep})
      LIMIT 1
    `;
    if (!anchor.length) {
      return { messages: [], lastId: null };
    }
    const a = anchor[0];
    const rows = await sql`
      SELECT * FROM chat_messages
      WHERE media_id = ${mediaId}
        AND (episode_key IS NOT DISTINCT FROM ${ep})
        AND (
          created_at > ${a.created_at}
          OR (created_at = ${a.created_at} AND id > ${a.id})
        )
      ORDER BY created_at ASC, id ASC
      LIMIT ${lim}
    `;
    const messages = rows.map(rowToMessage);
    const last = messages[messages.length - 1];
    return { messages, lastId: last?.id ?? null };
  }

  const rows = await sql`
    SELECT * FROM (
      SELECT * FROM chat_messages
      WHERE media_id = ${mediaId}
        AND (episode_key IS NOT DISTINCT FROM ${ep})
      ORDER BY created_at DESC, id DESC
      LIMIT ${lim}
    ) t
    ORDER BY created_at ASC, id ASC
  `;
  const messages = rows.map(rowToMessage);
  const last = messages[messages.length - 1];
  return { messages, lastId: last?.id ?? null };
}

/**
 * Feed global (moderación): todos los mensajes, más recientes primero.
 * @param {object} opts
 * @param {number} [opts.limit]
 * @param {string|null} [opts.beforeId] - UUID del mensaje más antiguo de la página anterior (paginación hacia atrás)
 * @param {string|null} [opts.afterId] - UUID del mensaje más reciente ya mostrado: devuelve solo mensajes más nuevos (tiempo real)
 * @param {string|null} [opts.mediaId] - Filtrar por sala (opcional)
 */
export async function listGlobalFeed({
  limit = 50,
  beforeId = null,
  afterId = null,
  mediaId = null,
}) {
  const sql = getNeonSql();
  const lim = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const mid =
    mediaId && String(mediaId).length > 0 && String(mediaId).length <= 256
      ? String(mediaId)
      : null;

  if (afterId && beforeId) {
    throw new Error('afterId y beforeId no pueden usarse a la vez');
  }

  if (afterId) {
    const anchor = await sql`
      SELECT created_at, id FROM chat_messages WHERE id = ${afterId}::uuid LIMIT 1
    `;
    if (!anchor.length) {
      return { messages: [], nextBeforeId: null };
    }
    const a = anchor[0];
    if (mid) {
      const rows = await sql`
        SELECT * FROM chat_messages
        WHERE media_id = ${mid}
          AND (created_at, id) > (${a.created_at}, ${a.id}::uuid)
        ORDER BY created_at DESC, id DESC
        LIMIT ${lim}
      `;
      return { messages: rows.map(rowToMessage), nextBeforeId: null };
    }
    const rows = await sql`
      SELECT * FROM chat_messages
      WHERE (created_at, id) > (${a.created_at}, ${a.id}::uuid)
      ORDER BY created_at DESC, id DESC
      LIMIT ${lim}
    `;
    return { messages: rows.map(rowToMessage), nextBeforeId: null };
  }

  if (beforeId) {
    const anchor = await sql`
      SELECT created_at, id FROM chat_messages WHERE id = ${beforeId}::uuid LIMIT 1
    `;
    if (!anchor.length) {
      return { messages: [], nextBeforeId: null };
    }
    const a = anchor[0];
    if (mid) {
      const rows = await sql`
        SELECT * FROM chat_messages
        WHERE media_id = ${mid}
          AND (created_at, id) < (${a.created_at}, ${a.id}::uuid)
        ORDER BY created_at DESC, id DESC
        LIMIT ${lim}
      `;
      const messages = rows.map(rowToMessage);
      const nextBeforeId =
        messages.length > 0 ? messages[messages.length - 1].id : null;
      return { messages, nextBeforeId };
    }
    const rows = await sql`
      SELECT * FROM chat_messages
      WHERE (created_at, id) < (${a.created_at}, ${a.id}::uuid)
      ORDER BY created_at DESC, id DESC
      LIMIT ${lim}
    `;
    const messages = rows.map(rowToMessage);
    const nextBeforeId =
      messages.length > 0 ? messages[messages.length - 1].id : null;
    return { messages, nextBeforeId };
  }

  if (mid) {
    const rows = await sql`
      SELECT * FROM chat_messages
      WHERE media_id = ${mid}
      ORDER BY created_at DESC, id DESC
      LIMIT ${lim}
    `;
    const messages = rows.map(rowToMessage);
    const nextBeforeId =
      messages.length > 0 ? messages[messages.length - 1].id : null;
    return { messages, nextBeforeId };
  }

  const rows = await sql`
    SELECT * FROM chat_messages
    ORDER BY created_at DESC, id DESC
    LIMIT ${lim}
  `;
  const messages = rows.map(rowToMessage);
  const nextBeforeId =
    messages.length > 0 ? messages[messages.length - 1].id : null;
  return { messages, nextBeforeId };
}

/**
 * @param {object} opts
 * @param {string} opts.mediaId
 * @param {string|null|undefined} opts.episodeKey
 * @param {string} opts.authorUid
 * @param {string|null|undefined} opts.authorDisplayName
 * @param {string} opts.body
 */
export async function appendMessage({
  mediaId,
  episodeKey = null,
  authorUid,
  authorDisplayName = null,
  body,
}) {
  const sql = getNeonSql();
  const ep = episodeKey ?? null;
  const rows = await sql`
    INSERT INTO chat_messages (
      media_id, episode_key, author_uid, author_display_name, body
    ) VALUES (
      ${mediaId},
      ${ep},
      ${authorUid},
      ${authorDisplayName},
      ${body}
    )
    RETURNING *
  `;
  return rowToMessage(rows[0]);
}
