'use client';

import { useEffect, useState, FormEvent } from 'react';
import Cookies from 'js-cookie';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';

const MapPicker = dynamic(() => import('../../components/MapPicker'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-line/20 animate-pulse flex items-center justify-center text-ink-soft text-sm">Loading map...</div>
});

interface UserProfile {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  subscriptions: any[];
}

export default function Dashboard() {
  const { dbUser, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Onboarding form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchProfile = async () => {
    try {
      const token = Cookies.get('token');
      if (!token) {
        return;
      }
      setError('');
      const res = await fetch('http://localhost:4000/api/v1/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data.user);
      } else {
        setError('Failed to load profile');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && dbUser) {
      fetchProfile();
    }
  }, [authLoading, dbUser]);

  const handleUpdateProfile = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = Cookies.get('token');
      const res = await fetch('http://localhost:4000/api/v1/auth/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, email })
      });
      
      if (res.ok) {
        await fetchProfile(); // refresh profile
      } else {
        setError('Failed to save details');
      }
    } catch (err) {
      setError('An error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

  const [editingAddress, setEditingAddress] = useState<any>(null);
  const [editLine1, setEditLine1] = useState('');
  const [editLine2, setEditLine2] = useState('');
  const [editPincode, setEditPincode] = useState('');
  const [savingAddress, setSavingAddress] = useState(false);
  
  // Map Modal State
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [mapAddressId, setMapAddressId] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number} | null>(null);
  const [mapInitialPos, setMapInitialPos] = useState<{lat: number, lng: number} | undefined>(undefined);

  const handleEditClick = (address: any) => {
    setEditingAddress(address);
    setEditLine1(address.line1);
    setEditLine2(address.line2 || '');
    setEditPincode(address.pincode);
  };

  const handleOpenMap = (address: any) => {
    setMapAddressId(address.id);
    if (address.lat && address.lng) {
      setMapInitialPos({ lat: address.lat, lng: address.lng });
      setSelectedLocation({ lat: address.lat, lng: address.lng });
    } else {
      setMapInitialPos(undefined);
      setSelectedLocation(null);
    }
    setIsMapModalOpen(true);
  };

  const handleUpdateAddress = async (e: FormEvent) => {
    e.preventDefault();
    setSavingAddress(true);
    try {
      const token = Cookies.get('token');
      const res = await fetch(`http://localhost:4000/api/v1/addresses/${editingAddress.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ line1: editLine1, line2: editLine2, pincode: editPincode })
      });
      if (res.ok) {
        await fetchProfile();
        setEditingAddress(null);
      } else {
        alert('Failed to update address');
      }
    } catch (err) {
      alert('An error occurred while saving address');
    } finally {
      setSavingAddress(false);
    }
  };

  const handleSaveLocation = async () => {
    if (!selectedLocation || !mapAddressId) return;
    setSavingAddress(true);
    try {
      const token = Cookies.get('token');
      const res = await fetch(`http://localhost:4000/api/v1/addresses/${mapAddressId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ lat: selectedLocation.lat, lng: selectedLocation.lng })
      });
      if (res.ok) {
        await fetchProfile();
        setIsMapModalOpen(false);
      } else {
        alert('Failed to save location');
      }
    } catch (err) {
      alert('An error occurred while saving location');
    } finally {
      setSavingAddress(false);
    }
  };

  // Geolocation and Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`);
      const data = await res.json();
      setSearchResults(data);
    } catch (err) {
      console.error("Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (result: any) => {
    setMapInitialPos({ lat: parseFloat(result.lat), lng: parseFloat(result.lon) });
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleLocateMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMapInitialPos({ lat: position.coords.latitude, lng: position.coords.longitude });
        },
        (error) => {
          alert("Unable to retrieve your location. Please check browser permissions.");
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  // ── Skip Delivery State ──
  const [skipModalSubId, setSkipModalSubId] = useState<string | null>(null);
  const [skipDate, setSkipDate] = useState('');
  const [skipLoading, setSkipLoading] = useState(false);
  const [skipSuccess, setSkipSuccess] = useState('');
  const [skipError, setSkipError] = useState('');
  const [subSkipDates, setSubSkipDates] = useState<Record<string, {id: string, date: string}[]>>({});

  // Fetch skip dates for a subscription
  const fetchSkipDates = async (subscriptionId: string) => {
    try {
      const token = Cookies.get('token');
      const res = await fetch(`http://localhost:4000/api/v1/subscriptions/${subscriptionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const futureSkips = (data.subscription.skipDates || [])
          .filter((sd: any) => new Date(sd.date) >= today)
          .map((sd: any) => ({ id: sd.id, date: sd.date }));
        setSubSkipDates(prev => ({ ...prev, [subscriptionId]: futureSkips }));
      }
    } catch (err) {
      console.error('Failed to fetch skip dates');
    }
  };

  // Fetch skip dates for all active subs on mount
  useEffect(() => {
    if (profile?.subscriptions) {
      for (const sub of profile.subscriptions) {
        if (sub.status === 'ACTIVE') {
          fetchSkipDates(sub.id);
        }
      }
    }
  }, [profile]);

  const openSkipModal = (subId: string) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSkipDate(tomorrow.toISOString().split('T')[0]);
    setSkipSuccess('');
    setSkipError('');
    setSkipModalSubId(subId);
  };

  const handleSkipDelivery = async () => {
    if (!skipModalSubId || !skipDate) return;
    setSkipLoading(true);
    setSkipError('');
    setSkipSuccess('');
    try {
      const token = Cookies.get('token');
      const res = await fetch(`http://localhost:4000/api/v1/subscriptions/${skipModalSubId}/skip-date`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ date: skipDate })
      });

      const data = await res.json();

      if (res.ok) {
        setSkipSuccess(data.message || `Delivery skipped for ${skipDate}`);
        await fetchSkipDates(skipModalSubId);
        // Auto-close modal after short delay
        setTimeout(() => setSkipModalSubId(null), 1500);
      } else {
        setSkipError(data.error || 'Failed to skip delivery');
      }
    } catch (err) {
      setSkipError('Something went wrong. Please try again.');
    } finally {
      setSkipLoading(false);
    }
  };

  const handleUnskip = async (subscriptionId: string, skipDateId: string) => {
    try {
      const token = Cookies.get('token');
      const res = await fetch(`http://localhost:4000/api/v1/subscriptions/${subscriptionId}/skip-date/${skipDateId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchSkipDates(subscriptionId);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to undo skip');
      }
    } catch (err) {
      alert('Something went wrong');
    }
  };

  // ── Cancel Subscription State ──
  const [cancelModalSubId, setCancelModalSubId] = useState<string | null>(null);
  const [cancelModalPlanName, setCancelModalPlanName] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState('');
  const [cancelError, setCancelError] = useState('');

  const openCancelModal = (subId: string, planName: string) => {
    setCancelSuccess('');
    setCancelError('');
    setCancelModalSubId(subId);
    setCancelModalPlanName(planName);
  };

  const handleCancelSubscription = async () => {
    if (!cancelModalSubId) return;
    setCancelLoading(true);
    setCancelError('');
    try {
      const token = Cookies.get('token');
      const res = await fetch(`http://localhost:4000/api/v1/subscriptions/${cancelModalSubId}/cancel`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setCancelSuccess(data.message || 'Subscription cancelled');
        await fetchProfile();
        setTimeout(() => setCancelModalSubId(null), 1500);
      } else {
        setCancelError(data.error || 'Failed to cancel subscription');
      }
    } catch (err) {
      setCancelError('Something went wrong. Please try again.');
    } finally {
      setCancelLoading(false);
    }
  };

  if (loading) {
    return <div className="text-ink-soft animate-pulse">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="text-red-500 bg-red-50 p-4 rounded-lg">{error}</div>;
  }

  if (profile && !profile.name) {
    // Show onboarding form
    return (
      <div className="max-w-md mx-auto mt-12 bg-bg-card border border-line rounded-[20px] p-8 shadow-soft">
        <h1 className="font-serif text-2xl font-semibold text-green-deep mb-2">Welcome to Elaneeru!</h1>
        <p className="text-ink-soft text-sm mb-8">Before we continue, what should we call you?</p>
        
        <form onSubmit={handleUpdateProfile} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-ink-soft mb-1.5">Full Name</label>
            <input 
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full p-2.5 bg-white border border-line rounded-lg text-ink focus:border-green-mid focus:outline-none"
              placeholder="E.g. Chetana M"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink-soft mb-1.5">Email Address <span className="font-normal text-xs">(optional)</span></label>
            <input 
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full p-2.5 bg-white border border-line rounded-lg text-ink focus:border-green-mid focus:outline-none"
              placeholder="you@example.com"
            />
          </div>
          <button 
            type="submit"
            disabled={saving || !name.trim()}
            className="w-full bg-green-deep text-[#F9F7EE] py-3 rounded-lg font-semibold hover:bg-green-mid transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Continue to Dashboard'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-serif text-[2.2rem] font-semibold text-green-deep mb-2">
        Hello, {profile?.name?.split(' ')[0]} 👋
      </h1>
      <p className="text-ink-soft mb-10">Manage your coconut deliveries and subscriptions.</p>

      {profile?.subscriptions?.length === 0 ? (
        <div className="bg-bg-card border border-dashed border-green-mid/40 rounded-[20px] p-12 text-center">
          <div className="w-16 h-16 bg-green-pale text-green-deep rounded-full flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>
          <h3 className="text-xl text-green-deep font-semibold mb-2">No active subscriptions</h3>
          <p className="text-ink-soft mb-6 max-w-[30ch] mx-auto">You aren't subscribed to any delivery plans yet. Start a new habit today!</p>
          <a href="/#plans" className="inline-block bg-gold text-green-deep py-3 px-6 rounded-lg font-semibold hover:bg-gold-deep transition-colors">
            View Plans
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {profile?.subscriptions?.map((sub: any) => (
            <div key={sub.id} className="bg-bg-card border border-line rounded-2xl shadow-soft overflow-hidden">
              {/* Row 1: Plan info + actions */}
              <div className="px-5 py-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <h3 className="font-serif text-lg font-semibold text-green-deep">{sub.plan.name}</h3>
                    <span className="text-sm text-ink-soft">
                      {sub.plan.quantity} coconut{sub.plan.quantity > 1 ? 's' : ''} · {sub.plan.frequency.toLowerCase().replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {/* Location pin */}
                  <button
                    onClick={() => handleOpenMap(sub.address)}
                    className={`p-1.5 rounded-full transition-colors ${
                      sub.address.lat && sub.address.lng
                        ? 'text-[#e81c64] hover:bg-red-50'
                        : 'text-ink-soft/40 hover:bg-black/5 hover:text-ink-soft'
                    }`}
                    title={sub.address.lat ? 'View/adjust location' : 'Set delivery location'}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                  </button>
                  {/* Status badge */}
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                    sub.status === 'ACTIVE' ? 'bg-green-pale text-green-deep' :
                    sub.status === 'PAUSED' ? 'bg-amber-100 text-amber-700' :
                    sub.status === 'CANCELLED' ? 'bg-red-50 text-red-400' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {sub.status}
                  </span>
                  {/* Edit pencil */}
                  <button 
                    onClick={() => handleEditClick(sub.address)}
                    className="p-1.5 text-ink-soft hover:text-green-deep hover:bg-green-pale/50 rounded-full transition-colors"
                    title="Edit address"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Row 2: Address (compact) */}
              <div className="px-5 pb-3 -mt-1">
                <p className="text-sm text-ink-soft truncate">
                  {sub.address.line1}{sub.address.line2 ? `, ${sub.address.line2}` : ''} — {sub.address.pincode}
                </p>
              </div>

              {/* Upcoming Skips (inline chips) */}
              {subSkipDates[sub.id] && subSkipDates[sub.id].length > 0 && (
                <div className="px-5 pb-3 flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">Skips:</span>
                  {subSkipDates[sub.id].map((sd) => {
                    const d = new Date(sd.date);
                    const label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                    return (
                      <span key={sd.id} className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                        {label}
                        <button
                          onClick={() => handleUnskip(sub.id, sd.id)}
                          className="hover:bg-amber-100 rounded-full p-0.5 transition-colors"
                          title="Undo skip"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-2.5 h-2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Row 3: Skip + Cancel buttons */}
              <div className="flex border-t border-line">
                <button 
                  onClick={() => sub.status === 'ACTIVE' && openSkipModal(sub.id)}
                  disabled={sub.status !== 'ACTIVE'}
                  className="flex-1 py-2.5 text-xs font-semibold text-ink-soft hover:text-green-deep hover:bg-green-pale/30 transition-colors border-r border-line disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Skip delivery
                </button>
                <button 
                  onClick={() => (sub.status === 'ACTIVE' || sub.status === 'PAUSED') && openCancelModal(sub.id, sub.plan.name)}
                  disabled={sub.status === 'CANCELLED'}
                  className="flex-1 py-2.5 text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {sub.status === 'CANCELLED' ? 'Cancelled' : 'Cancel'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Cancel Subscription Modal ── */}
      {cancelModalSubId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-bg-card border border-line rounded-[20px] shadow-toast w-full max-w-sm overflow-hidden relative animate-in fade-in zoom-in-95 duration-200 p-8">
            <button 
              onClick={() => setCancelModalSubId(null)}
              className="absolute top-4 right-4 text-ink-soft hover:text-ink w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
            >
              ✕
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                </svg>
              </div>
              <div>
                <h2 className="font-serif text-xl font-semibold text-red-700">Cancel Subscription</h2>
                <p className="text-xs text-ink-soft">This action cannot be undone</p>
              </div>
            </div>

            <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm text-red-800">
                Are you sure you want to cancel your <strong>{cancelModalPlanName}</strong> subscription? Future deliveries will stop immediately.
              </p>
            </div>

            {cancelSuccess && (
              <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-xl border border-green-200 text-sm font-medium flex items-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {cancelSuccess}
              </div>
            )}

            {cancelError && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl border border-red-200 text-sm font-medium">
                {cancelError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setCancelModalSubId(null)}
                className="flex-1 border-[1.5px] border-line text-ink py-3 rounded-xl text-sm font-semibold hover:border-ink transition-colors"
              >
                Keep Subscription
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={cancelLoading || !!cancelSuccess}
                className="flex-1 bg-red-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancelLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Cancelling…
                  </span>
                ) : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Skip Delivery Modal ── */}
      {skipModalSubId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-bg-card border border-line rounded-[20px] shadow-toast w-full max-w-sm overflow-hidden relative animate-in fade-in zoom-in-95 duration-200 p-8">
            <button 
              onClick={() => setSkipModalSubId(null)}
              className="absolute top-4 right-4 text-ink-soft hover:text-ink w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
            >
              ✕
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h2 className="font-serif text-xl font-semibold text-green-deep">Skip a Delivery</h2>
                <p className="text-xs text-ink-soft">Choose the date you want to skip</p>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-semibold text-ink-soft mb-1.5">Skip delivery on</label>
              <input 
                type="date"
                value={skipDate}
                min={(() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; })()}
                onChange={(e) => setSkipDate(e.target.value)}
                className="w-full p-3 bg-white border border-line rounded-xl text-ink font-medium focus:border-green-mid focus:outline-none focus:ring-2 focus:ring-green-mid/20 transition-all"
              />
              <p className="text-xs text-ink-soft mt-2">
                No coconut delivery will be scheduled for this date. You can undo this anytime before 8 PM the night before.
              </p>
            </div>

            {skipSuccess && (
              <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-xl border border-green-200 text-sm font-medium flex items-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {skipSuccess}
              </div>
            )}

            {skipError && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl border border-red-200 text-sm font-medium">
                {skipError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setSkipModalSubId(null)}
                className="flex-1 border-[1.5px] border-line text-ink py-3 rounded-xl text-sm font-semibold hover:border-ink transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSkipDelivery}
                disabled={skipLoading || !skipDate || !!skipSuccess}
                className="flex-1 bg-amber-500 text-white py-3 rounded-xl text-sm font-semibold hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {skipLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Skipping…
                  </span>
                ) : 'Confirm Skip'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Address Modal */}
      {editingAddress && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-bg-card border border-line rounded-[20px] shadow-toast w-full max-w-md overflow-hidden relative animate-in fade-in zoom-in-95 duration-200 p-8">
            <button 
              onClick={() => setEditingAddress(null)}
              className="absolute top-4 right-4 text-ink-soft hover:text-ink w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
            >
              ✕
            </button>
            <h2 className="font-serif text-2xl font-semibold text-green-deep mb-6">Edit Delivery Details</h2>
            <form onSubmit={handleUpdateAddress} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1">Door No / Flat / Building</label>
                <input
                  type="text"
                  value={editLine1}
                  onChange={(e) => setEditLine1(e.target.value)}
                  className="w-full p-2.5 bg-white border border-line rounded-lg text-ink focus:border-green-mid focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1">Street / Area</label>
                <input
                  type="text"
                  value={editLine2}
                  onChange={(e) => setEditLine2(e.target.value)}
                  className="w-full p-2.5 bg-white border border-line rounded-lg text-ink focus:border-green-mid focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1">Pincode</label>
                <input
                  type="text"
                  value={editPincode}
                  onChange={(e) => setEditPincode(e.target.value.replace(/\D/g, ''))}
                  maxLength={6}
                  className="w-full p-2.5 bg-white border border-line rounded-lg text-ink focus:border-green-mid focus:outline-none"
                  required
                />
              </div>
              <button 
                type="submit" 
                disabled={savingAddress || !editLine1 || !editLine2 || editPincode.length !== 6}
                className="w-full bg-green-deep text-[#F9F7EE] py-3 rounded-lg font-semibold hover:bg-green-mid transition-colors disabled:opacity-50 mt-4"
              >
                {savingAddress ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modern Map Location Picker Modal */}
      {isMapModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 md:p-10">
          <div className="bg-bg-card shadow-toast w-full max-w-xl h-[85vh] md:h-[600px] flex flex-col relative animate-in fade-in zoom-in-95 duration-200 overflow-hidden md:rounded-[24px]">
            
            {/* Header / Search Area */}
            <div className="bg-white p-4 pt-6 md:p-5 z-20 shadow-sm flex items-center gap-3">
              <button 
                onClick={() => setIsMapModalOpen(false)}
                className="text-ink-soft hover:text-ink w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors shrink-0"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <line x1="19" y1="12" x2="5" y2="12"></line>
                  <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
              </button>
              
              <div className="flex-1 relative">
                <form onSubmit={handleSearch}>
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-ink-soft">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search a new address (e.g., Basavanagudi)"
                    className="w-full bg-bg py-2.5 pl-10 pr-4 rounded-xl text-sm font-medium text-ink placeholder:text-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-green-mid transition-all"
                  />
                  <button type="submit" className="hidden">Search</button>
                </form>

                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-line rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {searchResults.map((res: any, idx: number) => (
                      <div 
                        key={idx}
                        onClick={() => handleSelectSearchResult(res)}
                        className="px-4 py-3 hover:bg-bg cursor-pointer border-b border-line last:border-0"
                      >
                        <p className="text-sm font-medium text-ink truncate">{res.display_name.split(',')[0]}</p>
                        <p className="text-xs text-ink-soft truncate">{res.display_name}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Map Container */}
            <div className="flex-1 w-full relative bg-bg">
              <MapPicker 
                initialPosition={mapInitialPos}
                onLocationChange={(lat, lng) => setSelectedLocation({lat, lng})}
                interactive={true}
              />
              
              {/* Fixed Center Pin Overlay */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-20">
                {/* Tooltip */}
                <div className="bg-[#0b0717] text-white px-3 py-1.5 rounded-lg shadow-md mb-2 flex flex-col items-center transform -translate-y-8 animate-bounce-soft">
                  <span className="text-xs font-semibold tracking-wide">Order will be delivered here</span>
                  {/* Tooltip arrow */}
                  <div className="absolute -bottom-1.5 w-0 h-0 border-l-6 border-r-6 border-t-6 border-transparent border-t-[#0b0717]"></div>
                </div>
                
                {/* Pin Icon */}
                <div className="flex flex-col items-center -mt-6">
                  <div className="w-6 h-6 bg-[#e81c64] rounded-full shadow-[0_0_0_6px_rgba(232,28,100,0.2)] z-10"></div>
                  <div className="w-1 h-6 bg-[#e81c64] -mt-1 rounded-full"></div>
                  <div className="w-4 h-1.5 bg-black/20 rounded-full blur-[2px] mt-1"></div>
                </div>
              </div>

              {/* Locate Me Button */}
              <button 
                onClick={handleLocateMe}
                className="absolute bottom-6 right-4 z-20 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-[#6e19d1] hover:bg-gray-50 transition-colors"
                title="Locate me"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <circle cx="12" cy="12" r="10"></circle>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </button>
            </div>

            {/* Bottom Card */}
            <div className="bg-white rounded-t-3xl -mt-6 z-30 pt-6 pb-6 px-6 shadow-[0_-8px_20px_-10px_rgba(0,0,0,0.1)] relative">
              <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-10 h-1.5 bg-line rounded-full"></div>
              
              <div className="mb-6">
                <h3 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
                  Delivery Location
                </h3>
                <p className="text-sm text-ink-soft mt-1.5">
                  Drag the map to align the pin exactly with your doorstep.
                </p>
                {selectedLocation && (
                  <p className="text-xs font-mono text-ink-soft/60 mt-2 bg-bg px-2 py-1 rounded inline-block">
                    {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                  </p>
                )}
              </div>

              <button 
                onClick={handleSaveLocation}
                disabled={!selectedLocation || savingAddress}
                className="w-full py-3.5 text-base font-bold bg-[#e81c64] text-white rounded-xl shadow-[0_8px_16px_rgba(232,28,100,0.2)] hover:bg-[#d4185a] transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100"
              >
                {savingAddress ? 'Saving...' : 'Confirm & Continue'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
