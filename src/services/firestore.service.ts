import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";

export class FirestoreService {
  async getCollection<T>(path: string): Promise<T[]> {
    const snapshot = await getDocs(collection(db, path));

    return snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as T[];
  }

  async getDocument<T>(path: string, id: string): Promise<T | null> {
    const snapshot = await getDoc(doc(db, path, id));

    if (!snapshot.exists()) return null;

    return {
      id: snapshot.id,
      ...snapshot.data(),
    } as T;
  }

  async create(path: string, data: object) {
    return addDoc(collection(db, path), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  async update(path: string, id: string, data: object) {
    return updateDoc(doc(db, path, id), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  }

  async delete(path: string, id: string) {
    return deleteDoc(doc(db, path, id));
  }
}

export const firestoreService = new FirestoreService();