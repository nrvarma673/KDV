/* ==========================================================================
   FIREBASE CONFIGURATION — FILL THIS IN AFTER YOU CREATE YOUR FIREBASE PROJECT
   ==========================================================================
   Where to get these values:
     1. Go to https://console.firebase.google.com and sign in with the
        Google account you want to use (nrvarma.673@gmail.com).
     2. Create a project (see README.md, Step 1) named e.g. "kdv-life-journey".
     3. In the project, click the "</>" (Web) icon to register a web app.
     4. Firebase will show you a config object exactly like the one below —
        copy each value into the matching field here.

   NOTE ON SAFETY: unlike a database password, this config is NOT a secret.
   Google's own documentation confirms these values are safe to expose in
   public client-side code — real protection comes from the Firestore and
   Storage SECURITY RULES (firestore.rules / storage.rules in this project),
   not from hiding this file. Still, no photos or personal data are stored
   in this file or anywhere else in this repository — only this generic
   connection info.
   ========================================================================== */

const firebaseConfig = {
  apiKey: "AIzaSyDm4rtMPeETwp6UA49SsDGFXhKbEHBU0Ms",
  authDomain: "kdv-life-journey.firebaseapp.com",
  projectId: "kdv-life-journey",
  storageBucket: "kdv-life-journey.firebasestorage.app",
  messagingSenderId: "421041042631",
  appId: "1:421041042631:web:7764663f60f3044b617ae2"
};

// Initialise Firebase (uses the compat SDK loaded via CDN in each HTML page)
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
