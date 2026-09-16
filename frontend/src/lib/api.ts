// Base URL for the backend API
// Defaults to the live Render backend URL in production, or localhost during development
export const API_BASE_URL = 
  process.env.NEXT_PUBLIC_API_URL || 
  (typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:4000'
    : 'https://elarneeru.onrender.com');
