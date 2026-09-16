'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Cookies from 'js-cookie';
import { useAuth } from '@/contexts/AuthContext';
import { API_BASE_URL } from '@/lib/api';

interface Delivery {
  id: string;
  status: string;
  quantity: number;
  subscription: {
    user: { name: string; phone: string };
    plan: { name: string };
    address: { line1: string; line2?: string; pincode: string };
  };
}

interface AdminData {
  date: string;
  total: number;
  byPincode: Record<string, Delivery[]>;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user, dbUser, loading } = useAuth();
  
  const [dateStr, setDateStr] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<AdminData | null>(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (loading) return;
    
    // Redirect if not logged in or not an admin
    if (!user || (dbUser && dbUser.role !== 'ADMIN' && dbUser.role !== 'DELIVERY_PARTNER')) {
      router.push('/');
      return;
    }

    fetchDeliveries();
  }, [user, dbUser, loading, dateStr]);

  const fetchDeliveries = async () => {
    setFetchLoading(true);
    try {
      const token = Cookies.get('token');
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/deliveries?date=${dateStr}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Failed to fetch deliveries');
      
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Error loading deliveries');
    } finally {
      setFetchLoading(false);
    }
  };

  const markDelivered = async (deliveryId: string) => {
    try {
      const token = Cookies.get('token');
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/deliveries/${deliveryId}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ status: 'DELIVERED' })
      });
      
      if (!res.ok) throw new Error('Failed to update status');
      
      // Refresh data
      fetchDeliveries();
    } catch (err: any) {
      alert(err.message || 'Could not update delivery');
    }
  };

  if (loading || !user || !dbUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="w-8 h-8 rounded-full border-4 border-gold border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="bg-[rgba(242,244,230,0.88)] backdrop-blur-md border-b border-line sticky top-0 z-50">
        <div className="max-w-[1180px] mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-serif text-2xl font-semibold text-green-deep flex items-center gap-2">
              <svg className="w-[26px] h-[26px] shrink-0" viewBox="0 0 26 26" fill="none">
                <circle cx="13" cy="14" r="10" fill="#E3A23A"/>
              </svg>
              elaneeru <span className="text-[1rem] font-sans text-gold-deep bg-[rgba(227,162,58,0.14)] px-2 py-0.5 rounded-full ml-2">Dispatch</span>
            </Link>
          </div>
          <div className="flex items-center gap-4 text-sm font-semibold">
            <Link href="/dashboard" className="text-ink-soft hover:text-green-deep">My Dashboard</Link>
          </div>
        </div>
      </header>

      <main className="max-w-[1180px] mx-auto px-8 py-10">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <h1 className="text-3xl font-serif text-green-deep">Delivery Roster</h1>
          
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-ink-soft">Date:</label>
            <input 
              type="date" 
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="px-3 py-2 rounded-lg border border-line bg-white text-ink text-sm focus:outline-none focus:border-green-mid"
            />
            <button 
              onClick={fetchDeliveries}
              className="px-4 py-2 bg-[#EADFC0] hover:bg-[#D3E6C6] text-green-deep text-sm font-semibold rounded-lg transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-100">
            {error}
          </div>
        )}

        {fetchLoading ? (
          <div className="flex justify-center py-20">
             <div className="w-8 h-8 rounded-full border-4 border-gold border-t-transparent animate-spin"></div>
          </div>
        ) : !data || Object.keys(data.byPincode).length === 0 ? (
          <div className="bg-bg-card border border-line rounded-xl p-12 text-center text-ink-soft">
            <p>No deliveries scheduled for {dateStr}.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {Object.entries(data.byPincode).map(([pincode, deliveries]) => (
              <div key={pincode} className="bg-white rounded-2xl shadow-sm border border-line overflow-hidden">
                <div className="bg-green-deep px-6 py-4 flex items-center justify-between">
                  <h2 className="text-[#F9F7EE] font-serif text-xl">Area: {pincode}</h2>
                  <span className="bg-[#1D4B3A] text-gold font-semibold text-sm px-3 py-1 rounded-full">
                    {deliveries.length} drop{deliveries.length > 1 ? 's' : ''}
                  </span>
                </div>
                
                <div className="divide-y divide-line">
                  {deliveries.map((delivery) => (
                    <div key={delivery.id} className="p-6 flex items-center justify-between max-md:flex-col max-md:items-start max-md:gap-4">
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-green-deep text-lg">{delivery.subscription.user.name || 'Customer'}</span>
                          <a href={`tel:${delivery.subscription.user.phone}`} className="text-sm font-semibold text-gold-deep hover:underline">
                            {delivery.subscription.user.phone}
                          </a>
                        </div>
                        <p className="text-ink text-sm">
                          {delivery.subscription.address.line1}
                          {delivery.subscription.address.line2 ? `, ${delivery.subscription.address.line2}` : ''}
                        </p>
                        <div className="flex items-center gap-3 pt-1">
                          <span className="text-sm font-medium bg-[#EADFC0] text-brown px-2 py-0.5 rounded">
                            {delivery.subscription.plan.name} ({delivery.quantity} coconuts)
                          </span>
                          <span className="text-sm font-medium bg-[#D3E6C6] text-green-mid px-2 py-0.5 rounded">
                            Prepaid
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center justify-end w-48">
                        {delivery.status === 'DELIVERED' ? (
                          <div className="flex items-center gap-1.5 text-green-mid font-semibold text-sm">
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12l5 5L20 7"/></svg>
                            Delivered
                          </div>
                        ) : (
                          <button 
                            onClick={() => markDelivered(delivery.id)}
                            className="bg-gold text-green-deep font-semibold text-sm px-5 py-2.5 rounded-lg hover:bg-gold-deep transition-all w-full md:w-auto"
                          >
                            Mark Delivered
                          </button>
                        )}
                      </div>

                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
