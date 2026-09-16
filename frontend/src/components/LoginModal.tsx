'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { auth } from '../lib/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Cleanup on unmount or when modal closes
  useEffect(() => {
    return () => {
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (e) {
          // ignore
        }
        window.recaptchaVerifier = null;
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const getRecaptchaVerifier = () => {
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch (e) {
        // ignore
      }
      window.recaptchaVerifier = null;
    }

    const container = document.getElementById('recaptcha-container');
    if (container) {
      container.innerHTML = '';
    }

    const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
    });
    window.recaptchaVerifier = verifier;
    return verifier;
  };

  const handleSendOtp = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Simple Indian phone number validation
    let formattedPhone = phone.trim();
    if (formattedPhone.length === 10) {
      formattedPhone = '+91' + formattedPhone;
    } else if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone;
    }

    try {
      const appVerifier = getRecaptchaVerifier();
      const result = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(result);
      setStep('OTP');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to send OTP');
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (e) {}
        window.recaptchaVerifier = null;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    if (!confirmationResult) return;
    
    setLoading(true);
    setError('');

    try {
      const userCredential = await confirmationResult.confirm(otp);
      const idToken = await userCredential.user.getIdToken(true);

      // Exchange Firebase token with backend to set cookie before navigation
      const res = await fetch('http://localhost:4000/api/v1/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ idToken })
      });

      if (res.ok) {
        const data = await res.json();
        Cookies.set('token', data.token, { expires: 7 });
        onClose();
        router.push('/dashboard');
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Authentication with server failed');
      }
    } catch (err: any) {
      console.error(err);
      setError('Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-bg-card border border-line rounded-[20px] shadow-toast w-full max-w-sm overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-ink-soft hover:text-ink w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
        >
          ✕
        </button>
        
        <div className="p-8">
          <h2 className="font-serif text-2xl font-semibold text-green-deep mb-2">
            {step === 'PHONE' ? 'Sign in or sign up' : 'Enter verification code'}
          </h2>
          <p className="text-ink-soft text-sm mb-6">
            {step === 'PHONE' 
              ? 'Enter your phone number to continue.'
              : `We sent a code to ${phone}`
            }
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
              {error}
            </div>
          )}

          {step === 'PHONE' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1">Phone Number</label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 border border-r-0 border-line bg-gray-50 rounded-l-lg text-ink-soft text-sm font-medium">
                    +91
                  </span>
                  <input
                    type="tel"
                    value={phone.replace('+91', '')}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="9876543210"
                    maxLength={10}
                    className="flex-1 w-full p-2.5 bg-white border border-line rounded-r-lg text-ink focus:border-green-mid focus:outline-none"
                    required
                  />
                </div>
              </div>
              <button 
                type="submit" 
                disabled={loading || phone.length < 10}
                className="w-full bg-green-deep text-[#F9F7EE] py-3 rounded-lg font-semibold hover:bg-green-mid transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Send OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1">6-digit Code</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full p-2.5 text-center tracking-widest text-lg font-mono bg-white border border-line rounded-lg text-ink focus:border-green-mid focus:outline-none"
                  required
                />
              </div>
              <button 
                type="submit" 
                disabled={loading || otp.length < 6}
                className="w-full bg-green-deep text-[#F9F7EE] py-3 rounded-lg font-semibold hover:bg-green-mid transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying...' : 'Verify & Continue'}
              </button>
              <button 
                type="button"
                onClick={() => {
                  setStep('PHONE');
                  setOtp('');
                  setError('');
                }}
                className="w-full text-center text-sm font-medium text-ink-soft hover:text-ink mt-2"
              >
                Change phone number
              </button>
            </form>
          )}

          <div id="recaptcha-container"></div>
        </div>
      </div>
    </div>
  );
}

// Add recaptchaVerifier to Window object for TypeScript
declare global {
  interface Window {
    recaptchaVerifier: any;
  }
}
