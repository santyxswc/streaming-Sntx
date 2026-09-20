import { collection, doc, setDoc, onSnapshot, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { v4 as uuidv4 } from 'uuid';

/**
 * Creates a new Watch Party room.
 * @param {string} mediaId - The slug/ID of the movie or series.
 * @param {string} mediaType - 'movie' or 'series'.
 * @param {string} episodeId - Optional ID for the specific episode if it's a series.
 */
export const createParty = async (mediaId, mediaType, episodeId = null) => {
  if (!db) throw new Error("Database not initialized");
  
  const partyId = uuidv4().split('-')[0].toUpperCase(); // Short readable ID
  const partyRef = doc(db, 'parties', partyId);
  
  const partyData = {
    id: partyId,
    mediaId,
    mediaType,
    episodeId,
    isPlaying: false,
    currentTime: 0,
    lastSyncAt: serverTimestamp(),
    hostId: null, // We'll manage this via session or local storage
    createdAt: serverTimestamp(),
  };

  await setDoc(partyRef, partyData);
  return partyId;
};

/**
 * Joins an existing party and listens for updates.
 * @param {string} partyId - The room ID.
 * @param {function} onUpdate - Callback for room changes.
 */
export const subscribeToParty = (partyId, onUpdate) => {
  if (!db) throw new Error("Database not initialized");
  
  const partyRef = doc(db, 'parties', partyId);
  return onSnapshot(partyRef, (snapshot) => {
    if (snapshot.exists()) {
      onUpdate(snapshot.data());
    } else {
      onUpdate(null);
    }
  });
};

/**
 * Updates the playback state of the party.
 * @param {string} partyId - The room ID.
 * @param {boolean} isPlaying - Playing state.
 * @param {number} currentTime - Current playback time in seconds.
 */
export const updatePartyState = async (partyId, isPlaying, currentTime) => {
  if (!db) throw new Error("Database not initialized");
  
  const partyRef = doc(db, 'parties', partyId);
  await updateDoc(partyRef, {
    isPlaying,
    currentTime,
    lastSyncAt: serverTimestamp(),
  });
};

/**
 * Fetches initial party data.
 */
export const getParty = async (partyId) => {
  if (!db) throw new Error("Database not initialized");
  const partyRef = doc(db, 'parties', partyId);
  const snapshot = await getDoc(partyRef);
  return snapshot.exists() ? snapshot.data() : null;
};
