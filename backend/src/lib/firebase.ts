import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { config } from '../config';
import path from 'path';
import fs from 'fs';

// Initialize Firebase Admin with the service account JSON
const serviceAccountPath = path.resolve(config.firebase.serviceAccountPath);

if (!fs.existsSync(serviceAccountPath)) {
  throw new Error(`Firebase service account file not found at: ${serviceAccountPath}`);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
    projectId: config.firebase.projectId,
  });
}

export const firebaseAuth = getAuth();
