import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";

import {
  db,
  ensureFirebaseAuth,
} from "../lib/firebase";

type FirestoreObject = object;

const FIRESTORE_WRITE_TIMEOUT_MS = 20_000;

async function withFirestoreTimeout<T>(operation: Promise<T>, description: string): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`${description} timed out after ${FIRESTORE_WRITE_TIMEOUT_MS / 1000} seconds. Check Firebase connectivity and Authentication.`));
    }, FIRESTORE_WRITE_TIMEOUT_MS);
  });
  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

export interface FirestoreBatchSetOperation {
  type: "set";
  path: string;
  id: string;
  data: FirestoreObject;
  merge?: boolean;
  serverTimestampFields?: string[];
  deleteFields?: string[];
}

export interface FirestoreBatchDeleteOperation {
  type: "delete";
  path: string;
  id: string;
}

export type FirestoreBatchOperation =
  | FirestoreBatchSetOperation
  | FirestoreBatchDeleteOperation;

function sanitizeFirestoreValue(
  value: unknown
): unknown {
  if (Array.isArray(value)) {
    return value
      .map(sanitizeFirestoreValue)
      .filter(
        (item) => item !== undefined
      );
  }

  if (
    value !== null &&
    typeof value === "object"
  ) {
    const entries = Object.entries(value)
      .filter(
        ([, item]) => item !== undefined
      )
      .map(([key, item]) => [
        key,
        sanitizeFirestoreValue(item),
      ]);

    return Object.fromEntries(entries);
  }

  return value;
}

function sanitizeFirestoreData<
  T extends FirestoreObject
>(data: T): object {
  return sanitizeFirestoreValue(
    data
  ) as object;
}

export class FirestoreService {
  async getCollection<T>(
    path: string
  ): Promise<T[]> {
    await ensureFirebaseAuth();

    const snapshot = await getDocs(
      collection(db, path)
    );

    return snapshot.docs.map(
      (documentSnapshot) => ({
        id: documentSnapshot.id,
        ...documentSnapshot.data(),
      })
    ) as T[];
  }

  async getDocument<T>(
    path: string,
    id: string
  ): Promise<T | null> {
    await ensureFirebaseAuth();

    const snapshot = await getDoc(
      doc(db, path, id)
    );

    if (!snapshot.exists()) {
      return null;
    }

    return {
      id: snapshot.id,
      ...snapshot.data(),
    } as T;
  }

  async create<T extends FirestoreObject>(
    path: string,
    data: T
  ) {
    await ensureFirebaseAuth();

    const sanitizedData =
      sanitizeFirestoreData(data);

    return addDoc(collection(db, path), {
      ...sanitizedData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  async setDocument<
    T extends FirestoreObject
  >(
    path: string,
    id: string,
    data: T
  ): Promise<void> {
    await ensureFirebaseAuth();

    const sanitizedData =
      sanitizeFirestoreData(data);

    await setDoc(
      doc(db, path, id),
      sanitizedData,
      {
        merge: true,
      }
    );
  }

  async update<T extends FirestoreObject>(
    path: string,
    id: string,
    data: T
  ) {
    await ensureFirebaseAuth();

    const sanitizedData =
      sanitizeFirestoreData(data);

    return updateDoc(doc(db, path, id), {
      ...sanitizedData,
      updatedAt: serverTimestamp(),
    });
  }

  async delete(
    path: string,
    id: string
  ): Promise<void> {
    await ensureFirebaseAuth();

    await deleteDoc(doc(db, path, id));
  }

  async executeBatch(
    operations: readonly FirestoreBatchOperation[],
    options: { useTimeout?: boolean } = {}
  ): Promise<void> {
    if (operations.length === 0) {
      return;
    }

    await ensureFirebaseAuth();

    const batch = writeBatch(db);

    for (const operation of operations) {
      const documentReference = doc(
        db,
        operation.path,
        operation.id
      );

      if (operation.type === "delete") {
        batch.delete(documentReference);
        continue;
      }

      const dataWithTimestamps: Record<string, unknown> = {
        ...sanitizeFirestoreData(operation.data),
      };
      for (const field of operation.serverTimestampFields ?? []) {
        dataWithTimestamps[field] = serverTimestamp();
      }
      for (const field of operation.deleteFields ?? []) {
        dataWithTimestamps[field] = deleteField();
      }
      batch.set(
        documentReference,
        dataWithTimestamps,
        {
          merge: operation.merge ?? true,
        }
      );
    }

    const commit = batch.commit();
    if (options.useTimeout === false) {
      await commit;
    } else {
      await withFirestoreTimeout(commit, "Firestore save");
    }
  }
}

export const firestoreService =
  new FirestoreService();
