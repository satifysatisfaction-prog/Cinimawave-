// Firebase configuration for CineWorld
const firebaseConfig = {
  apiKey: "AIzaSyADPqo8kN2MgU68IZbT4jVQ4vCE9HAH2i4",
  authDomain: "ciniworld2-65cfe.firebaseapp.com",
  databaseURL: "https://ciniworld2-65cfe-default-rtdb.firebaseio.com",
  projectId: "ciniworld2-65cfe",
  storageBucket: "ciniworld2-65cfe.firebasestorage.app",
  messagingSenderId: "8302620300",
  appId: "1:8302620300:web:e7157abfd67fd50daed5a9"
};

if (typeof firebase !== "undefined" && !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
