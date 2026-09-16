'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import LoginModal from '@/components/LoginModal';
import CheckoutModal from '@/components/CheckoutModal';
import { useAuth } from '@/contexts/AuthContext';

export default function Home() {
  const [pincode, setPincode] = useState('');
  const [pincodeResult, setPincodeResult] = useState<{ msg: string; type: 'ok' | 'no' } | null>(null);
  
  const [selectedPlan, setSelectedPlan] = useState('family-pack');
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const { user, dbUser, logout } = useAuth();

  const [customQuantity, setCustomQuantity] = useState(5);

  const handleStartSubscription = () => {
    if (user) {
      setIsCheckoutOpen(true);
    } else {
      setIsLoginOpen(true);
    }
  };

  const plans = [
    {
      id: 'solo-sip',
      tag: 'Solo',
      name: 'Solo Sip',
      desc: 'One tender coconut, delivered every morning. Built for a single daily habit.',
      price: 65,
      qty: 1,
      freq: 'Every day'
    },
    {
      id: 'family-pack',
      tag: 'Most chosen',
      name: 'Family Pack',
      desc: 'Three coconuts a day — enough for a small household to share.',
      price: 170,
      qty: 3,
      freq: 'Every day'
    },
    {
      id: 'office-crate',
      tag: 'Bulk',
      name: 'Office Crate',
      desc: 'Ten coconuts, twice a week — for offices, gyms, and cafés.',
      price: 520,
      qty: 10,
      freq: 'Twice a week'
    },
    {
      id: 'custom-plan',
      tag: 'Flexible',
      name: 'Custom Plan',
      desc: 'Choose exactly how many coconuts you want delivered per day.',
      price: 65,
      qty: customQuantity,
      freq: 'Every day'
    }
  ];

  const handlePincodeCheck = () => {
    if (pincode.length !== 6 || isNaN(Number(pincode))) {
      setPincodeResult({ msg: 'Enter a valid 6-digit pincode.', type: 'no' });
      return;
    }
    const served = new Set([
      '560001','560008','560034','560038','560068','560095','560102','560011','560078','560085',
      '560018', // Chamarajpet
      '560060', // Kengeri
      '560072', // Nagarbhavi
      '560083', // Gottigere
      '562159', // Ramanagara
    ]);
    if (served.has(pincode)) {
      setPincodeResult({ msg: "You're in luck — we deliver to your area.", type: 'ok' });
    } else {
      setPincodeResult({ msg: "Not there yet — but we're expanding fast. We'll notify you.", type: 'no' });
    }
  };

  const activePlan = plans.find(p => p.id === selectedPlan) || plans[1];
  const multiplier = activePlan.freq === 'Every day' ? 30 : 8.6;
  const pricePerDelivery = activePlan.id === 'custom-plan' ? activePlan.price * activePlan.qty : activePlan.price;
  const estimatedMonthly = Math.round(pricePerDelivery * multiplier);

  return (
    <>
      <header className="sticky top-0 z-50 bg-[rgba(242,244,230,0.88)] backdrop-blur-md border-b border-line">
        <nav className="flex items-center justify-between py-4 px-8 max-w-[1180px] mx-auto">
          <Link href="/" className="font-serif text-2xl font-semibold text-green-deep flex items-center gap-2">
            <svg className="w-[26px] h-[26px] shrink-0" viewBox="0 0 26 26" fill="none">
              <circle cx="13" cy="14" r="10" fill="#E3A23A"/>
              <path d="M13 4C13 4 9 6 9 9" stroke="#123A2C" strokeWidth="1.6" strokeLinecap="round"/>
              <path d="M13 4C13 4 17 6 17 9" stroke="#123A2C" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
            elaneeru
          </Link>
          <div className="hidden md:flex items-center gap-8 text-[0.96rem] text-ink-soft font-medium">
            <a href="#how" className="hover:text-green-deep transition-colors">How it works</a>
            <a href="#plans" className="hover:text-green-deep transition-colors">Plans</a>
            <a href="#freshness" className="hover:text-green-deep transition-colors">Why us</a>
            <a href="#stories" className="hover:text-green-deep transition-colors">Stories</a>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                {dbUser?.role === 'ADMIN' && (
                  <Link href="/admin" className="text-[0.94rem] font-semibold text-gold-deep hover:text-gold transition-colors mr-2">Admin Panel</Link>
                )}
                <Link href="/dashboard" className="text-[0.94rem] font-semibold text-green-deep hover:text-green-mid transition-colors">Dashboard</Link>
                <button onClick={logout} className="text-[0.94rem] font-semibold text-ink-soft hover:text-red-500 transition-colors">Logout</button>
              </>
            ) : (
              <>
                <button onClick={() => setIsLoginOpen(true)} className="text-[0.94rem] font-semibold text-ink-soft hover:text-green-deep transition-colors">Log in</button>
                <button onClick={handleStartSubscription} className="bg-green-deep text-[#F9F7EE] py-2.5 px-5 rounded-lg font-semibold text-[0.94rem] hover:bg-green-mid hover:-translate-y-[1px] transition-all">
                  Start subscription
                </button>
              </>
            )}
          </div>
        </nav>
      </header>

      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
      <CheckoutModal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} planSlug={selectedPlan} quantity={activePlan.qty} />

      <section className="pt-[88px] pb-[60px] px-8 max-w-[1180px] mx-auto grid md:grid-cols-[1.05fr_0.95fr] gap-[56px] items-center max-md:pt-11 max-md:grid-cols-1">
        <div className="order-1 md:order-none">
          <div className="inline-flex items-center gap-2 text-[0.92rem] text-ink-soft font-medium mb-5">
            <span className="w-[7px] h-[7px] rounded-full bg-gold shrink-0"></span>
            Now delivering across Bengaluru
          </div>
          <h1 className="text-[clamp(2.4rem,4.4vw,3.6rem)] max-w-[12ch] mb-5">Coconut water, cut this morning.</h1>
          <p className="text-[1.14rem] text-ink-soft max-w-[42ch] mb-8">
            We pick tender coconuts straight from the farm before sunrise and bring them to your door the same day — chilled, hygienically sealed, and ready to open.
          </p>
          <div className="flex gap-3.5 flex-wrap mb-9">
            <button onClick={handleStartSubscription} className="bg-gold text-green-deep py-3.5 px-6 rounded-lg font-semibold text-[0.98rem] hover:bg-gold-deep hover:-translate-y-[1px] transition-all">
              Start your subscription
            </button>
            <a href="#how" className="bg-transparent text-green-deep py-3.5 px-6 rounded-lg font-semibold text-[0.98rem] border-[1.5px] border-line hover:border-green-deep transition-all">
              See how it works
            </a>
          </div>
          
          <div className="bg-bg-card border border-line rounded-[14px] p-4 max-w-[420px] shadow-soft">
            <label htmlFor="pincode" className="block text-[0.86rem] font-semibold text-ink-soft mb-2.5">
              Check delivery in your area
            </label>
            <div className="flex gap-2.5">
              <input 
                type="text" 
                id="pincode" 
                placeholder="Enter your pincode" 
                maxLength={6} 
                inputMode="numeric"
                className="flex-1 py-2.5 px-3 rounded-lg border-[1.5px] border-line bg-white text-ink focus:border-green-mid focus:outline-none"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePincodeCheck()}
              />
              <button 
                onClick={handlePincodeCheck}
                className="bg-green-deep text-[#F9F7EE] px-5 rounded-lg font-semibold text-[0.92rem] hover:bg-green-mid transition-colors"
              >
                Check
              </button>
            </div>
            {pincodeResult && (
              <p className={`mt-3 text-[0.88rem] font-semibold ${pincodeResult.type === 'ok' ? 'text-green-mid' : 'text-brown'}`}>
                {pincodeResult.msg}
              </p>
            )}
          </div>
        </div>

        <div className="relative max-md:max-w-[340px] max-md:mx-auto max-md:mb-3">
          <svg viewBox="0 0 460 460" fill="none" className="w-full h-auto">
            <path d="M230 30C310 30 390 90 400 190C410 290 350 400 230 420C110 400 50 290 60 190C70 90 150 30 230 30Z" fill="#D3E6C6"/>
            <path d="M120 260C90 200 100 130 150 90C130 140 130 200 155 250" stroke="#2E7D5C" strokeWidth="8" strokeLinecap="round" fill="none"/>
            <path d="M340 260C370 200 360 130 310 90C330 140 330 200 305 250" stroke="#2E7D5C" strokeWidth="8" strokeLinecap="round" fill="none"/>
            <ellipse cx="230" cy="270" rx="95" ry="110" fill="#B7CE8E"/>
            <ellipse cx="230" cy="270" rx="95" ry="110" fill="url(#huskGrad)" fillOpacity="0.5"/>
            <path d="M155 195C155 165 190 148 230 148C270 148 305 165 305 195L295 200C265 178 195 178 165 200Z" fill="#E3A23A"/>
            <ellipse cx="230" cy="197" rx="72" ry="20" fill="#F9F1DC"/>
            <ellipse cx="230" cy="197" rx="46" ry="12" fill="#EADFC0"/>
            <rect x="222" y="160" width="9" height="52" rx="4" fill="#123A2C" transform="rotate(-8 222 160)"/>
            <ellipse cx="140" cy="330" rx="46" ry="54" fill="#C6DBA9"/>
            <ellipse cx="322" cy="330" rx="46" ry="54" fill="#C6DBA9"/>
            <defs>
              <linearGradient id="huskGrad" x1="230" y1="160" x2="230" y2="380" gradientUnits="userSpaceOnUse">
                <stop stopColor="#9FBE73"/>
                <stop offset="1" stopColor="#7FA85A"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
      </section>

      <div className="border-y border-line bg-bg-card">
        <div className="max-w-[1180px] mx-auto py-6 px-8 flex justify-between items-center flex-wrap gap-4 max-sm:px-5">
          {['Harvested before sunrise', 'On your doorstep the same day', 'No sugar, no preservatives', 'Pause or cancel anytime'].map((t, i) => (
            <div key={i} className="flex items-center gap-2.5 text-[0.92rem] text-ink-soft font-medium">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[19px] h-[19px] text-green-mid"><path d="M5 12l5 5L20 7"/></svg>
              {t}
            </div>
          ))}
        </div>
      </div>

      <section id="how" className="py-24 px-8 max-w-[1180px] mx-auto max-sm:px-5 max-sm:py-16">
        <div className="max-w-[640px] mb-14">
          <h2 className="text-[clamp(1.9rem,3vw,2.5rem)] mb-4">From the farm to your fridge, in one day</h2>
          <p className="text-ink-soft text-[1.06rem] max-w-[50ch]">Most tender coconuts sold on the street have been sitting around for days. Ours haven't. Here's what happens between harvest and your doorbell.</p>
        </div>
        <div className="grid grid-cols-4 md:grid-cols-4 max-md:grid-cols-2 gap-0 border-t border-line max-md:gap-y-8 max-md:border-t-0">
          {[
            { num: '01', title: 'You subscribe', desc: 'Pick a plan and a delivery slot. Change your mind whenever — daily, alternate days, or weekly.' },
            { num: '02', title: 'We harvest at dawn', desc: 'Our partner farms near Kanakapura pick only what\'s ordered for that day — nothing sits in storage.' },
            { num: '03', title: 'Chilled within hours', desc: 'Coconuts are washed, trimmed, and moved into cold crates before the afternoon heat sets in.' },
            { num: '04', title: 'Delivered, ready to cut', desc: 'A pre-scored top means no machete required — just slice along the line and drink.' }
          ].map((s, i) => (
            <div key={i} className={`pt-8 pr-6 md:border-r border-line relative ${i === 3 ? 'md:border-r-0 md:pr-0' : ''} ${i % 2 === 0 ? 'max-md:border-r max-md:pr-6' : 'max-md:pl-6 max-md:pr-0'}`}>
              <span className="font-serif text-[1.1rem] text-gold-deep mb-4 block">{s.num}</span>
              <h3 className="text-[1.18rem] mb-2.5 text-green-deep">{s.title}</h3>
              <p className="text-ink-soft text-[0.95rem]">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="plans" className="bg-green-deep text-[#F3EFDF] py-24 max-sm:py-16">
        <div className="px-8 max-w-[1180px] mx-auto max-sm:px-5">
          <div className="max-w-[640px] mb-14">
            <h2 className="text-[clamp(1.9rem,3vw,2.5rem)] text-[#F9F7EE] mb-4">Pick a plan that fits your week</h2>
            <p className="text-[#C9D8CC] text-[1.06rem] max-w-[50ch]">All plans include free delivery, a spoon for the malai, and the option to skip a day whenever you're travelling.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {plans.map((p) => {
              const isSelected = selectedPlan === p.id;
              return (
                <div 
                  key={p.id}
                  onClick={() => setSelectedPlan(p.id)}
                  className={`border-[1.5px] rounded-[18px] p-7 cursor-pointer transition-all flex flex-col hover:-translate-y-[3px] ${
                    isSelected ? 'border-gold bg-[#1D4B3A]' : 'border-[rgba(249,247,238,0.14)] bg-[#173F30]'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[0.78rem] font-semibold text-gold bg-[rgba(227,162,58,0.14)] py-1 px-2.5 rounded-full">{p.tag}</span>
                    <div className={`w-5 h-5 rounded-full border-2 shrink-0 relative transition-colors ${isSelected ? 'border-gold' : 'border-[rgba(249,247,238,0.4)]'}`}>
                      <div className={`absolute inset-[3px] rounded-full bg-gold transition-transform ${isSelected ? 'scale-100' : 'scale-0'}`}></div>
                    </div>
                  </div>
                  <h3 className="font-serif text-[#F9F7EE] text-[1.3rem] mb-2 font-semibold">{p.name}</h3>
                  <p className="text-[#B9C9BB] text-[0.92rem] mb-5 flex-grow">{p.desc}</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-serif text-[2rem] text-[#F9F7EE] font-semibold">₹{p.id === 'custom-plan' ? p.price * p.qty : p.price}</span>
                    <span className="text-[#9FB3A2] text-[0.88rem]">/ {p.qty > 1 ? 'delivery' : 'day'}</span>
                  </div>
                  {p.id === 'custom-plan' && (
                    <div className="mt-5 flex items-center justify-between bg-[#0F2E22] rounded-lg p-1.5 w-full">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setCustomQuantity(Math.max(1, customQuantity - 1)); }}
                        className="w-10 h-10 flex items-center justify-center bg-[#173F30] rounded-md text-[#F9F7EE] hover:bg-gold transition-colors font-medium text-lg"
                      >-</button>
                      <span className="font-semibold text-[#F9F7EE] w-8 text-center">{customQuantity}</span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setCustomQuantity(customQuantity + 1); }}
                        className="w-10 h-10 flex items-center justify-center bg-[#173F30] rounded-md text-[#F9F7EE] hover:bg-gold transition-colors font-medium text-lg"
                      >+</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-8 bg-[#0F2E22] rounded-[14px] py-5 px-6 flex justify-between items-center flex-wrap gap-4">
            <div>
              <div className="text-[0.86rem] text-[#9FB3A2] mb-1">Your subscription</div>
              <div className="font-serif text-[1.5rem] text-[#F9F7EE]">{activePlan.name} — {activePlan.qty} coconut{activePlan.qty > 1 ? 's' : ''}, {activePlan.freq.toLowerCase()}</div>
            </div>
            <div>
              <div className="text-[0.86rem] text-[#9FB3A2] mb-1">Estimated monthly cost</div>
              <div className="font-serif text-[1.5rem] text-[#F9F7EE]">₹{estimatedMonthly.toLocaleString('en-IN')}</div>
            </div>
            <button onClick={handleStartSubscription} className="bg-gold text-green-deep py-3.5 px-6 rounded-lg font-semibold text-[0.98rem] hover:bg-gold-deep transition-colors">
              Start subscription
            </button>
          </div>
        </div>
      </section>

      {/* Freshness Section */}
      <section id="freshness" className="py-24 px-8 max-w-[1180px] mx-auto max-sm:px-5 max-sm:py-16">
        <div className="max-w-[640px] mb-14">
          <h2 className="text-[clamp(1.9rem,3vw,2.5rem)] mb-4">Why tender coconut, why us</h2>
          <p className="text-ink-soft text-[1.06rem] max-w-[50ch]">Tender coconut water is one of the few drinks that's genuinely good for you. We just make sure the one you get is the one you'd have picked yourself.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[
            {
              title: 'Natural electrolytes',
              desc: 'Potassium and sodium in a ratio your body actually absorbs — no added sugar needed.',
              icon: <path d="M12 2C12 2 6 9 6 14a6 6 0 0 0 12 0c0-5-6-12-6-12z"/>
            },
            {
              title: 'Same-day traceability',
              desc: 'Every crate is tagged with the farm and the harvest date, so you know exactly how fresh it is.',
              icon: <><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M4 10h16"/></>
            },
            {
              title: 'Cold chain, start to finish',
              desc: 'From the farm crate to your doorstep, coconuts never sit out in the heat.',
              icon: <><path d="M12 3v18M5 8l7-5 7 5M5 16l7 5 7-5"/></>
            },
            {
              title: 'Pre-scored, easy open',
              desc: 'No machete, no mess — just cut along the marked line and drink straight from the shell.',
              icon: <path d="M20 6L9 17l-5-5"/>
            }
          ].map((f, i) => (
            <div key={i} className="bg-bg-card border border-line rounded-[20px] p-7 flex gap-4 items-start">
              <div className="w-11 h-11 shrink-0 bg-green-pale rounded-xl flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-[22px] h-[22px] text-green-deep">
                  {f.icon}
                </svg>
              </div>
              <div>
                <h3 className="text-[1.08rem] mb-1.5 text-green-deep">{f.title}</h3>
                <p className="text-ink-soft text-[0.93rem]">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Stories Section */}
      <section id="stories" className="py-24 px-8 max-w-[1180px] mx-auto max-sm:px-5 max-sm:py-16 border-t border-line">
        <div className="max-w-[640px] mb-14">
          <h2 className="text-[clamp(1.9rem,3vw,2.5rem)] mb-4">What early customers are saying</h2>
          <p className="text-ink-soft text-[1.06rem] max-w-[50ch]">We're still in beta — a small set of neighbourhoods in Bengaluru have been trying us out.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { quote: "The water actually tastes like it did at my grandmother's farm in Mandya. Ordered again the same day.", who: "Ananya R.", loc: "Indiranagar" },
            { quote: "I run a small café and switched from the street vendor to the Office Crate. Consistent size, consistent water — customers noticed.", who: "Farhan S.", loc: "HSR Layout" },
            { quote: "Skipped deliveries for a week while travelling with one tap. That alone is worth it.", who: "Meera K.", loc: "Jayanagar" }
          ].map((t, i) => (
            <div key={i} className="bg-bg-card border border-line rounded-[20px] p-7">
              <p className="font-serif text-[1.08rem] text-green-deep mb-5 leading-relaxed">"{t.quote}"</p>
              <p className="text-[0.86rem] text-ink-soft font-medium">— <span className="text-green-deep font-semibold">{t.who}</span>, {t.loc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 px-8 max-w-[1180px] mx-auto max-sm:px-5 max-sm:py-8">
        <div className="bg-gold rounded-[26px] py-14 px-12 flex justify-between items-center flex-wrap gap-6 max-md:flex-col max-md:items-start max-md:p-7">
          <h2 className="text-[1.9rem] max-w-[16ch]">Ready to taste what real freshness is?</h2>
          <button onClick={handleStartSubscription} className="bg-green-deep text-[#F9F7EE] py-3.5 px-6 rounded-lg font-semibold text-[0.98rem] hover:bg-[#0F2E22] transition-colors">
            Start your subscription
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="pt-20 pb-10 border-t border-line mt-10">
        <div className="px-8 max-w-[1180px] mx-auto max-sm:px-5">
          <div className="grid grid-cols-1 md:grid-cols-[1.3fr_1fr_1fr_1fr] gap-10 mb-14 max-md:grid-cols-2">
            <div>
              <Link href="/" className="font-serif text-2xl font-semibold text-green-deep flex items-center gap-2 mb-3.5">
                <svg className="w-[26px] h-[26px] shrink-0" viewBox="0 0 26 26" fill="none">
                  <circle cx="13" cy="14" r="10" fill="#E3A23A"/>
                  <path d="M13 4C13 4 9 6 9 9" stroke="#123A2C" strokeWidth="1.6" strokeLinecap="round"/>
                  <path d="M13 4C13 4 17 6 17 9" stroke="#123A2C" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
                elaneeru
              </Link>
              <p className="text-ink-soft text-[0.9rem] max-w-[32ch]">Farm-fresh tender coconuts, subscribed and delivered daily across Bengaluru.</p>
            </div>
            <div>
              <h4 className="text-[0.86rem] font-semibold text-green-deep mb-4">Product</h4>
              <a href="#how" className="block text-ink-soft text-[0.92rem] mb-2.5 hover:text-green-deep">How it works</a>
              <a href="#plans" className="block text-ink-soft text-[0.92rem] mb-2.5 hover:text-green-deep">Plans & pricing</a>
              <a href="#freshness" className="block text-ink-soft text-[0.92rem] mb-2.5 hover:text-green-deep">Why tender coconut</a>
            </div>
            <div>
              <h4 className="text-[0.86rem] font-semibold text-green-deep mb-4">Company</h4>
              <a href="#" className="block text-ink-soft text-[0.92rem] mb-2.5 hover:text-green-deep">Our farms</a>
              <a href="#" className="block text-ink-soft text-[0.92rem] mb-2.5 hover:text-green-deep">Careers</a>
              <a href="#" className="block text-ink-soft text-[0.92rem] mb-2.5 hover:text-green-deep">Contact us</a>
            </div>
            <div>
              <h4 className="text-[0.86rem] font-semibold text-green-deep mb-4">Support</h4>
              <a href="#" className="block text-ink-soft text-[0.92rem] mb-2.5 hover:text-green-deep">Delivery areas</a>
              <a href="#" className="block text-ink-soft text-[0.92rem] mb-2.5 hover:text-green-deep">Manage subscription</a>
              <a href="#" className="block text-ink-soft text-[0.92rem] mb-2.5 hover:text-green-deep">Help centre</a>
            </div>
          </div>
          <div className="flex justify-between items-center pt-6 border-t border-line text-[0.84rem] text-ink-soft flex-wrap gap-3">
            <span>© 2026 Elaneeru. Beta preview.</span>
            <span>Bengaluru, Karnataka</span>
          </div>
        </div>
      </footer>
    </>
  );
}
