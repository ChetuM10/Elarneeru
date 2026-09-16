'use client';

import { useState, FormEvent, useEffect } from 'react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '../lib/api';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  planSlug: string;
  quantity?: number;
}

export default function CheckoutModal({ isOpen, onClose, planSlug, quantity }: CheckoutModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<'ADDRESS' | 'PAYMENT'>('ADDRESS');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [planData, setPlanData] = useState<any>(null);

  // Address fields
  const [doorNo, setDoorNo] = useState('');
  const [street, setStreet] = useState('');
  const [pincode, setPincode] = useState('');
  
  useEffect(() => {
    if (isOpen && planSlug) {
      // Fetch plan details from backend
      fetch(`${API_BASE_URL}/api/v1/plans/${planSlug}`)
        .then(res => res.json())
        .then(data => {
          if (data.plan) setPlanData(data.plan);
        })
        .catch(err => console.error("Failed to load plan", err));
    }
  }, [isOpen, planSlug]);

  if (!isOpen) return null;

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleAddressSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = Cookies.get('token');
      
      // 1. Check Serviceability
      const checkRes = await fetch(`${API_BASE_URL}/api/v1/serviceability/check?pincode=${pincode}`);
      const checkData = await checkRes.json();
      
      if (!checkRes.ok || !checkData.serviceable) {
        throw new Error(checkData.message || checkData.error || 'Delivery not available at this pincode.');
      }

      // 2. Save Address
      const addressRes = await fetch(`${API_BASE_URL}/api/v1/addresses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          line1: doorNo,
          line2: street,
          pincode: pincode,
          label: 'Home'
        })
      });

      if (!addressRes.ok) {
        throw new Error('Failed to save address.');
      }

      const addressData = await addressRes.json();
      
      // Proceed to payment step
      initiatePayment(addressData.address.id);

    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setLoading(false);
    }
  };

  const initiatePayment = async (addressId: string) => {
    try {
      const token = Cookies.get('token');
      
      // Calculate first month amount (30 days for daily)
      // This is a simplified calculation for the demo
      const multiplier = planData.frequency === 'DAILY' ? 30 : 8.6;
      
      const isCustom = planSlug === 'custom-plan';
      const basePrice = planData.pricePerUnit;
      const pricePerDelivery = isCustom ? basePrice * (quantity || 1) : basePrice;
      const amountPaise = Math.round(pricePerDelivery * multiplier);

      // 1. Create Subscription
      const today = new Date();
      // Start tomorrow
      today.setDate(today.getDate() + 1);
      
      const subRes = await fetch(`${API_BASE_URL}/api/v1/subscriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          planId: planData.id,
          addressId: addressId,
          startDate: today.toISOString(),
          quantity: quantity || 1,
        })
      });
      
      if (!subRes.ok) {
        const errorData = await subRes.json();
        throw new Error(errorData.error || 'Failed to create subscription.');
      }
      
      const subData = await subRes.json();
      const subscriptionId = subData.subscription.id;

      // 2. Create Order
      const orderRes = await fetch(`${API_BASE_URL}/api/v1/payments/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          subscriptionId,
          amount: amountPaise,
          periodStart: new Date().toISOString(),
          periodEnd: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString()
        })
      });

      const orderData = await orderRes.json();

      // 3. Load Razorpay
      const res = await loadRazorpay();
      if (!res) throw new Error("Razorpay SDK failed to load");

      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Elaneeru",
        description: `Subscription for ${planData.name}`,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          // 4. Verify Payment
          try {
            await fetch(`${API_BASE_URL}/api/v1/payments/verify`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify(response)
            });
            // Success! Redirect to dashboard
            router.push('/dashboard');
          } catch (e) {
            setError("Payment verification failed");
          }
        },
        theme: {
          color: "#123A2C"
        }
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();

    } catch (err: any) {
      setError(err.message || 'Payment initiation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-bg-card border border-line rounded-[20px] shadow-toast w-full max-w-md overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-ink-soft hover:text-ink w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
        >
          ✕
        </button>
        
        <div className="p-8">
          <h2 className="font-serif text-2xl font-semibold text-green-deep mb-2">Checkout</h2>
          <p className="text-ink-soft text-sm mb-6">
            Where should we deliver your {planData ? planData.name : 'coconuts'}?
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleAddressSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-ink-soft mb-1">Door No / Flat / Building</label>
              <input
                type="text"
                value={doorNo}
                onChange={(e) => setDoorNo(e.target.value)}
                placeholder="E.g. Flat 4B, Green Apartments"
                className="w-full p-2.5 bg-white border border-line rounded-lg text-ink focus:border-green-mid focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-soft mb-1">Street / Area</label>
              <input
                type="text"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="E.g. 1st Main, Indiranagar"
                className="w-full p-2.5 bg-white border border-line rounded-lg text-ink focus:border-green-mid focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-soft mb-1">Pincode</label>
              <input
                type="text"
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                placeholder="560001"
                maxLength={6}
                className="w-full p-2.5 bg-white border border-line rounded-lg text-ink focus:border-green-mid focus:outline-none"
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={loading || !doorNo || !street || pincode.length !== 6 || !planData}
              className="w-full bg-green-deep text-[#F9F7EE] py-3 rounded-lg font-semibold hover:bg-green-mid transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? 'Processing...' : 'Proceed to Payment'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
