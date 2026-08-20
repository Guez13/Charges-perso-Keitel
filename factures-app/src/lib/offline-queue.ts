// ---------------------------------------------------------------------------
// File d'attente d'upload HORS-LIGNE (IndexedDB, sans dépendance externe).
//
// Le resto peut shooter 5 factures dans un couloir sans réseau : on les stocke
// localement et on les envoie quand la connexion revient (section 6, étape 1).
// L'envoi réel (Supabase Storage) est branché plus tard ; ici on fournit la
// mécanique de persistance + de drainage, testable et déjà installable.
// ---------------------------------------------------------------------------

export type UploadStatut = 'en_attente' | 'en_cours' | 'envoye' | 'echec';

export interface UploadItem {
  id: string;
  etablissement_id: string;
  fichiers: Blob[]; // pages (photos) ou un PDF
  nom: string;
  cree_le: number;
  statut: UploadStatut;
  tentatives: number;
  derniere_erreur?: string;
}

const DB_NAME = 'factures-app';
const STORE = 'upload_queue';
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

export async function enqueue(
  item: Omit<UploadItem, 'id' | 'cree_le' | 'statut' | 'tentatives'>,
): Promise<UploadItem> {
  const full: UploadItem = {
    ...item,
    id: crypto.randomUUID(),
    cree_le: Date.now(),
    statut: 'en_attente',
    tentatives: 0,
  };
  await tx('readwrite', (s) => s.put(full));
  return full;
}

export async function listQueue(): Promise<UploadItem[]> {
  const items = await tx<UploadItem[]>('readonly', (s) => s.getAll());
  return items.sort((a, b) => a.cree_le - b.cree_le);
}

export async function removeItem(id: string): Promise<void> {
  await tx('readwrite', (s) => s.delete(id));
}

async function updateItem(item: UploadItem): Promise<void> {
  await tx('readwrite', (s) => s.put(item));
}

/**
 * Draine la file : tente d'envoyer chaque item en attente via `sender`.
 * Renvoie le nombre d'items envoyés. Ne jette pas — les échecs sont conservés
 * pour un prochain passage (au retour du réseau, à la réouverture de l'app).
 */
export async function drainQueue(
  sender: (item: UploadItem) => Promise<void>,
): Promise<number> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 0;
  const items = await listQueue();
  let envoyes = 0;
  for (const item of items) {
    if (item.statut === 'envoye') continue;
    try {
      await updateItem({ ...item, statut: 'en_cours' });
      await sender(item);
      await removeItem(item.id);
      envoyes++;
    } catch (e) {
      await updateItem({
        ...item,
        statut: 'echec',
        tentatives: item.tentatives + 1,
        derniere_erreur: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return envoyes;
}

/** Relance le drainage automatiquement au retour du réseau (fallback iOS où
 *  Background Sync n'est pas garanti). */
export function autoDrainOnReconnect(sender: (item: UploadItem) => Promise<void>): () => void {
  const handler = () => void drainQueue(sender);
  window.addEventListener('online', handler);
  return () => window.removeEventListener('online', handler);
}
