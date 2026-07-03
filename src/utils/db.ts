import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  writeBatch,
  getDocFromServer
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import { PurchaseRequest } from "../types";

// 1. Initialize Firebase App and Firestore
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// 2. Validate connection to Firestore on initialization (as required by the skill)
async function testConnection() {
  try {
    // Simple test connection
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firestore client is offline. Please check your network or configuration.");
    }
  }
}
testConnection();

// 3. Error handling specification conforming to FirestoreErrorInfo
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// 4. CRUD Operations

// Load all purchase requests from Firebase Firestore
export async function getAllRequests(): Promise<PurchaseRequest[]> {
  const path = "requests";
  try {
    const querySnapshot = await getDocs(collection(db, path));
    const requestsList: PurchaseRequest[] = [];
    querySnapshot.forEach((docSnap) => {
      requestsList.push(docSnap.data() as PurchaseRequest);
    });
    // Sort by index descending (newest first) or ascending?
    // Let's sort by index ascending so that the newest gets added cleanly
    return requestsList.sort((a, b) => a.index - b.index);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

// Overwrite or batch save multiple purchase requests to Firebase Firestore
export async function saveRequests(allData: PurchaseRequest[]): Promise<boolean> {
  const path = "requests";
  try {
    // Firestore batch write supports up to 500 documents at once.
    // If the data is larger, we chunk it into multiple batches.
    const chunkSize = 400;
    for (let i = 0; i < allData.length; i += chunkSize) {
      const chunk = allData.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach((req) => {
        const docRef = doc(db, path, req.id);
        batch.set(docRef, req);
      });
      await batch.commit();
    }
    return true;
  } catch (error) {
    console.error("Batch save to Firestore failed:", error);
    try {
      handleFirestoreError(error, OperationType.WRITE, path);
    } catch (e) {}
    return false;
  }
}

// Add or update a single purchase request in Firebase Firestore
export async function saveRequest(newRequest: PurchaseRequest): Promise<boolean> {
  const path = `requests/${newRequest.id}`;
  try {
    const docRef = doc(db, "requests", newRequest.id);
    await setDoc(docRef, newRequest);
    return true;
  } catch (error) {
    console.error("Save single request to Firestore failed:", error);
    try {
      handleFirestoreError(error, OperationType.WRITE, path);
    } catch (e) {}
    return false;
  }
}

// Delete multiple purchase requests from Firebase Firestore
export async function deleteRequests(idsToDelete: string[] | number[]): Promise<boolean> {
  const path = "requests";
  try {
    const batch = writeBatch(db);
    idsToDelete.forEach((id) => {
      const docRef = doc(db, "requests", String(id));
      batch.delete(docRef);
    });
    await batch.commit();
    return true;
  } catch (error) {
    console.error("Delete from Firestore failed:", error);
    try {
      handleFirestoreError(error, OperationType.DELETE, path);
    } catch (e) {}
    return false;
  }
}
