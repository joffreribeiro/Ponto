// firebase-init.js
// Inicializa Firebase, autenticação anônima e funções de load/save para Firestore

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithEmailAndPassword, signOut, getIdTokenResult } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyC3euGrayxErDKDJvHT5WN6ixkeqTwwp8M",
  authDomain: "ponto-68b4a.firebaseapp.com",
  projectId: "ponto-68b4a",
  storageBucket: "ponto-68b4a.firebasestorage.app",
  messagingSenderId: "516394911771",
  appId: "1:516394911771:web:89c861d000cb95a594d0be"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// State interno para aguardar auth
let _user = null;
onAuthStateChanged(auth, user => {
  _user = user;
});

// Tenta login anônimo (ignore erro se já estiver logado)
signInAnonymously(auth).catch(e => {
  console.warn('Firebase signInAnonymously falhou:', e && e.message ? e.message : e);
});

// Expor helpers adicionais de autenticação
async function signIn(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

async function doSignOut() {
  return signOut(auth);
}

async function getCurrentUser() {
  return auth.currentUser || null;
}

async function getClaims() {
  if (!auth.currentUser) return null;
  const idRes = await getIdTokenResult(auth.currentUser);
  return idRes ? idRes.claims : null;
}

// Helper: aguardar usuário autenticado (máx 8s)
function waitForUser(timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    if (auth.currentUser) return resolve(auth.currentUser);
    let waited = 0;
    const interval = 200;
    const t = setInterval(() => {
      if (auth.currentUser) {
        clearInterval(t);
        return resolve(auth.currentUser);
      }
      waited += interval;
      if (waited >= timeoutMs) {
        clearInterval(t);
        return reject(new Error('Timeout aguardando autenticação Firebase'));
      }
    }, interval);
  });
}

// Carrega dados do Firestore doc 'ponto/{uid}'. Retorna objeto de dados ou null
export async function loadFromFirestore() {
  await waitForUser();
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário Firebase não autenticado');
  const docRef = doc(db, 'ponto', user.uid);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  const data = snap.data();
  return data.dados || null;
}

// Salva dados no Firestore (merge)
export async function saveToFirestore(dados) {
  await waitForUser();
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário Firebase não autenticado');
  const docRef = doc(db, 'ponto', user.uid);
  await setDoc(docRef, { dados }, { merge: true });
}

// Utilitário para sincronizar (salva localmente e no Firestore)
export async function syncToCloud(dados) {
  try {
    // chama Storage.save (se disponível) para salvar localmente antes
    if (window.Storage && typeof window.Storage.save === 'function') {
      window.Storage.save(dados);
    }
  } catch (e) {
    console.warn('Falha ao salvar localmente antes do sync:', e);
  }

  try {
    await saveToFirestore(dados);
    return { ok: true };
  } catch (e) {
    console.warn('Falha ao salvar no Firestore:', e);
    return { ok: false, error: e };
  }
}

// Expor helpers no global para uso no console e no app
window.FirebaseSync = {
  loadFromFirestore,
  saveToFirestore,
  syncToCloud
};

// adicionar helpers de auth ao global
window.FirebaseSync.signIn = signIn;
window.FirebaseSync.signOut = doSignOut;
window.FirebaseSync.waitForUser = waitForUser;
window.FirebaseSync.onAuthStateChanged = function(cb) { return onAuthStateChanged(auth, cb); };
window.FirebaseSync.getCurrentUser = getCurrentUser;
window.FirebaseSync.getClaims = getClaims;

console.info('Firebase init carregado');
