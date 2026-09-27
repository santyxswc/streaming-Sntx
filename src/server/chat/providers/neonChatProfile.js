import 'server-only';
import { getNeonSql } from '@/server/db/neonSql';
import {
  generateRandomChatName,
  normalizeChatNameKey,
  validateCustomChatName,
} from '@/lib/chatUsernameGenerator';

/**
 * Comprueba si el nombre está libre para este usuario (formato, reservados, BD).
 * @returns {Promise<{ available: true, name: string } | { available: false, reason: string, error?: string }>}
 */
export async function isChatNameAvailable(uid, rawName) {
  const v = validateCustomChatName(rawName);
  if (!v.ok) {
    return { available: false, reason: 'invalid', error: v.error };
  }
  const key = normalizeChatNameKey(v.name);
  const sql = getNeonSql();
  const taken = await sql`
    SELECT uid FROM chat_user_profiles
    WHERE lower(chat_name) = ${key} AND uid <> ${uid}
    LIMIT 1
  `;
  if (taken.length) {
    return { available: false, reason: 'taken', error: 'Ese nombre ya está en uso' };
  }
  return { available: true, name: v.name };
}

function isUniqueViolation(err) {
  const code = err?.code;
  return code === '23505';
}

/**
 * @param {string} uid - Firebase uid
 * @returns {Promise<{ chatName: string }>}
 */
export async function getOrCreateProfile(uid) {
  const sql = getNeonSql();
  const existing = await sql`
    SELECT chat_name FROM chat_user_profiles WHERE uid = ${uid} LIMIT 1
  `;
  if (existing.length) {
    return { chatName: existing[0].chat_name };
  }

  for (let i = 0; i < 30; i += 1) {
    const name = generateRandomChatName();
    try {
      await sql`
        INSERT INTO chat_user_profiles (uid, chat_name)
        VALUES (${uid}, ${name})
      `;
      return { chatName: name };
    } catch (err) {
      if (isUniqueViolation(err)) continue;
      throw err;
    }
  }
  throw new Error('No se pudo asignar un nombre de chat');
}

/**
 * @param {string} uid
 * @param {string} rawNewName
 * @returns {Promise<{ chatName: string } | { error: string, status: number }>}
 */
export async function updateChatName(uid, rawNewName) {
  await getOrCreateProfile(uid);

  const check = await isChatNameAvailable(uid, rawNewName);
  if (!check.available) {
    const status = check.reason === 'taken' ? 409 : 400;
    return { error: check.error || 'Nombre no válido', status };
  }
  const newName = check.name;

  const sql = getNeonSql();
  const rows = await sql`
    UPDATE chat_user_profiles
    SET chat_name = ${newName}, updated_at = now()
    WHERE uid = ${uid}
    RETURNING chat_name
  `;
  if (!rows.length) {
    return { error: 'Perfil de chat no encontrado', status: 404 };
  }
  return { chatName: rows[0].chat_name };
}
