import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD5jASxGWZygIRtOOY2rgbO02DmYgAXXPU",
  authDomain: "logithon-3dbdd.firebaseapp.com",
  projectId: "logithon-3dbdd",
  storageBucket: "logithon-3dbdd.appspot.com",
  messagingSenderId: "622846205663",
  appId: "1:622846205663:web:41686b9f79e1905be4536a",
  measurementId: "G-5THH1TCL19"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { auth };
export default app; 