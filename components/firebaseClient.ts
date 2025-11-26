import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBngjjfMrWg7O9TABuQNI0rlq-ktce9U30",
  authDomain: "historiaacessivel-ii.firebaseapp.com",
  projectId: "historiaacessivel-ii",
  storageBucket: "historiaacessivel-ii.firebasestorage.app",
  messagingSenderId: "652479717072",
  appId: "1:652479717072:web:49b1824c113c67faed08d5"
};


// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Habilita persistência offline (IndexedDB)
// Isso permite que o app funcione offline e reduz leituras em sessões subsequentes (principalmente para listeners)
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
        // Múltiplas abas abertas, persistência só pode ser habilitada em uma.
        console.warn('Persistence failed: Multiple tabs open');
    } else if (err.code == 'unimplemented') {
        // O navegador não suporta a persistência
        console.warn('Persistence failed: Browser not supported');
    }
});

export const storage = getStorage(app);