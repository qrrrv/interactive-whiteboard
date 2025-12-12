// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB5oGZkVIRzgPusjdLhWoskj2DF0ii9nEU",
  authDomain: "doska-36ab5.firebaseapp.com",
  projectId: "doska-36ab5",
  storageBucket: "doska-36ab5.firebasestorage.app",
  messagingSenderId: "558238185780",
  appId: "1:558238185780:web:5ad7f5403fae38e189cd61",
  measurementId: "G-3YFY2LX17P"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
