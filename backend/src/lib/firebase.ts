import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { config } from '../config';
import path from 'path';
import fs from 'fs';

let serviceAccount: any;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (e) {
    throw new Error('Failed to parse FIREBASE_SERVICE_ACCOUNT environment variable JSON');
  }
} else if (config.firebase.serviceAccountPath) {
  const serviceAccountPath = path.resolve(config.firebase.serviceAccountPath);
  if (!fs.existsSync(serviceAccountPath)) {
    throw new Error(`Firebase service account file not found at: ${serviceAccountPath}`);
  }
  serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
} else {
  throw new Error('Firebase credentials not found (set FIREBASE_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT_PATH)');
}

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
    projectId: config.firebase.projectId || serviceAccount.project_id,
  });
}

export const firebaseAuth = getAuth();
