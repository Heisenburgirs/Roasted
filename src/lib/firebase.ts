// lib/firebase.ts
import * as admin from 'firebase-admin';

// Define service account type
interface ServiceAccount {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
  universe_domain: string;
}

// Check if already initialized to prevent multiple initializations
if (!admin.apps.length) {
  try {
    // Directly parse the service account from a JSON string in environment variable
    const serviceAccount = JSON.parse(
      process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}'
    );

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
    });
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
    // Throw the error to prevent silent failures
    throw new Error(`Firebase initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Export the Firestore instance
const db = admin.firestore();
export { db };