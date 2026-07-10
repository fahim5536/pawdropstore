import firebaseImport from 'firebase/compat/app';
import 'firebase/compat/database';
import firebaseConfigJSON from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: firebaseConfigJSON.apiKey,
  authDomain: firebaseConfigJSON.authDomain,
  databaseURL: `https://${firebaseConfigJSON.projectId}-default-rtdb.firebaseio.com`,
  projectId: firebaseConfigJSON.projectId,
  storageBucket: firebaseConfigJSON.storageBucket,
  messagingSenderId: firebaseConfigJSON.messagingSenderId,
  appId: firebaseConfigJSON.appId
};

const firebase = (typeof window !== 'undefined' && window.firebase) ? window.firebase : firebaseImport;

const app = firebase.apps.length === 0 ? firebase.initializeApp(firebaseConfig) : firebase.app();
export const db = app.database();

// EmailJS init
if (typeof emailjs !== 'undefined') {
  emailjs.init("VtVCAwfHXJbz5Y9hT");
}

// CJ Config (Secrets kept secure on server-side proxy)
export const CJ_CONFIG = {
  email: "",
  password: "",
  baseUrl: "/api/cj"
};

// EmailJS Config
export const EMAILJS_CONFIG = {
  serviceId: "service_cvzrjtp",
  confirmTemplate: "template_9rw73u3",
  updateTemplate: "template_mbzms4d"
};
