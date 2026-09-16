import dotenv from 'dotenv';
dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  brandName: string;
  database: {
    url: string;
  };
  firebase: {
    projectId: string;
    clientEmail: string;
    serviceAccountPath: string;
    apiKey: string;
    authDomain: string;
  };
  razorpay: {
    keyId: string;
    keySecret: string;
    webhookSecret: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
}

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return val;
}

export const config: Config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  brandName: process.env.BRAND_NAME || 'Elaneeru',
  database: {
    url: requireEnv('DATABASE_URL'),
  },
  firebase: {
    projectId: requireEnv('FIREBASE_PROJECT_ID'),
    clientEmail: requireEnv('FIREBASE_CLIENT_EMAIL'),
    serviceAccountPath: requireEnv('FIREBASE_SERVICE_ACCOUNT_PATH'),
    apiKey: process.env.FIREBASE_API_KEY || '',
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
  },
  razorpay: {
    keyId: requireEnv('RAZORPAY_KEY_ID'),
    keySecret: requireEnv('RAZORPAY_KEY_SECRET'),
    webhookSecret: requireEnv('RAZORPAY_WEBHOOK_SECRET'),
  },
  jwt: {
    secret: requireEnv('JWT_SECRET'),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
};
