// src/firebase.js
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyDxxyyeYpqhyUHQF7fKkLJcICYoXDWvdbg",
  authDomain: "ecosort-6ab5c.firebaseapp.com",
  projectId: "ecosort-6ab5c",
  storageBucket: "ecosort-6ab5c.firebasestorage.app",
  messagingSenderId: "591486107501",
  appId: "1:591486107501:web:4ece31d87803835c4ea464",
  measurementId: "G-ST3ZXT65W0"
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

export { db }
