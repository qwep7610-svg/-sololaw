import { db, collection, addDoc, query, where, orderBy, onSnapshot, deleteDoc, doc, updateDoc, serverTimestamp, OperationType, handleFirestoreError } from '../lib/firebase';

export interface SavedComplaint {
  id: string;
  userId: string;
  type: string;
  date: string;
  title: string;
  content: string;
  data: any;
  createdAt?: any;
}

export const saveToHistory = async (userId: string, type: string, data: Omit<SavedComplaint, 'id' | 'userId' | 'type' | 'date' | 'createdAt'>) => {
  const path = `users/${userId}/history`;
  try {
    await addDoc(collection(db, path), {
      ...data,
      userId,
      type,
      date: new Date().toLocaleString(),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const subscribeToHistory = (userId: string, callback: (history: SavedComplaint[]) => void) => {
  const path = `users/${userId}/history`;
  const q = query(collection(db, path), orderBy('createdAt', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const history = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as SavedComplaint[];
    callback(history);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};

export const deleteFromHistory = async (userId: string, historyId: string) => {
  const path = `users/${userId}/history/${historyId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'history', historyId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const updateHistory = async (userId: string, historyId: string, updates: Partial<SavedComplaint>) => {
  const path = `users/${userId}/history/${historyId}`;
  try {
    await updateDoc(doc(db, 'users', userId, 'history', historyId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};
