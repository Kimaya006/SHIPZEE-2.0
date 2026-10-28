// Firebase setup. Every other file imports `auth` and `db` from here,
// so the config lives in exactly one place.
//
// Replace the values below with your own: Firebase console >
// Project settings > Your apps > Web app > SDK setup and configuration.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyASn3dFfDh27LvZwGr2PM4ARUmHDyftewk",
  authDomain: "shipzee-57ccb.firebaseapp.com",
  projectId: "shipzee-57ccb",
  //storageBucket: "shipzee-57ccb.firebasestorage.app",
  //messagingSenderId: "930589593149",
  appId: "1:930589593149:web:510500a58e8cf4aa136454",
  //measurementId: "G-712LQEMP59"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
