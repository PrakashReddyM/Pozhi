import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, Star, Truck, Shield, ShieldCheck, BadgePercent, MapPin,
  Instagram, Youtube,
  ChevronLeft, ChevronRight, X,
  Camera, Headset, Heart,
  Cake, PartyPopper, Baby, Home as HomeIcon, Users,
} from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";

import Navbar from "@/components/Navbar";
import passphotImg from "@/assets/services/passphoto.jpg";
import photocopiesImg from "@/assets/services/photocopies.jpg";
import framesImg from "@/assets/services/frames.jpg";
import albumImg from "@/assets/services/album.jpg";
import heroBanner from "@/assets/hero-banner.jpg";
import heroBanner2 from "@/assets/hero-banner-2.jpg";
import heroBanner3 from "@/assets/hero-banner-3.jpg";
import photographerBg from "@/assets/photographer-bg.jpg";
import svcPassPhotos from "@/assets/services/pass-photos.jpg";
import svcPhotoCopies from "@/assets/services/photo-copies.jpg";
import svcPhotoFrames from "@/assets/services/photo-frames.jpg";
import svcGiftFrames from "@/assets/services/gift-frames.jpg";
import svcMiniAlbums from "@/assets/services/mini-albums.jpg";
import svcSnapPrint from "@/assets/services/snapnprint.jpg";
import logoImg from "@/assets/logo-original.png";

const heroSlides = [
  { img: heroBanner, alt: "Prints, frames and albums on a table — Real Moments. Lasting Memories." },
  { img: heroBanner2, alt: "Personalised gift combos — mugs, albums and keepsakes — Perfect Gifts for Every Moment" },
  { img: heroBanner3, alt: "Devotional photo frames and prints — Faith Brings Peace" },
];

const iconServices = [
  {
    id: "passphoto",
    img: svcPassPhotos,
    title: "Pass photos",
    desc: "Passport, visa & stamp sizes.",
    path: "/studio/passphoto",
  },
  {
    id: "photocopies",
    img: svcPhotoCopies,
    title: "Photo copies",
    desc: "4×6 glossy prints, sharp & vibrant.",
    path: "/studio/photocopies",
  },
  {
    id: "frames",
    img: svcPhotoFrames,
    title: "Photo frames",
    desc: "Personalised frames for your moments.",
    path: "/studio/frames",
  },
  {
    id: "giftframes",
    img: svcGiftFrames,
    title: "Gift frames",
    desc: "Devotional frames & gift sets.",
    path: "/studio/frames",
  },
  {
    id: "album",
    img: svcMiniAlbums,
    title: "Mini albums",
    desc: "Beautiful albums from your photos.",
    path: "/studio/album",
  },
  {
    id: "snapnprint",
    img: svcSnapPrint,
    title: "Snap & print",
    desc: "Instant prints at your location.",
    path: "/studio/snapnprint",
  },
];

const combos = [
  { title: "Document Ready Combo", price: "₹299", img: passphotImg, path: "/studio/passphoto" },
  { title: "Memory Saver Combo", price: "₹499", img: framesImg, path: "/studio/frames" },
  { title: "Gift Combo – Memories", price: "₹699", img: albumImg, path: "/studio/album" },
  { title: "Everyday Prints Combo", price: "₹199", img: photocopiesImg, path: "/studio/photocopies" },
];

const eventTypes = [
  { icon: Cake, label: "Birthdays" },
  { icon: PartyPopper, label: "Anniversaries" },
  { icon: Baby, label: "Baby Celebrations" },
  { icon: HomeIcon, label: "Housewarmings" },
  { icon: Users, label: "Family Gatherings" },
];

const hourlyPackages = [
  { duration: "1 Hour", price: "₹1,000", extra: "" },
  { duration: "3 Hours", price: "₹2,500", extra: "+ 25 Photo Album (4x6)" },
  { duration: "6 Hours", price: "₹5,000", extra: "+ 25 Photo Album (4x6) + Extra Frame" },
  { duration: "Extra Hour", price: "₹1,000/hour", extra: "" },
];

const testimonials = [
  { name: "Priya S.", location: "Hyderabad", text: "Excellent quality and super fast delivery! My passport photos came out perfect.", rating: 5 },
  { name: "Ramesh K.", location: "Hyderabad", text: "The frame quality is amazing. Very happy with the service and packaging.", rating: 5 },
  { name: "Anusha R.", location: "Hyderabad", text: "Easy to order, great print quality and on-time delivery. Will definitely use again!", rating: 5 },
  { name: "Suresh M.", location: "Secunderabad", text: "Ordered a custom frame for my parents' anniversary. They absolutely loved it. Superb quality!", rating: 5 },
  { name: "Divya T.", location: "Hyderabad", text: "The album turned out beautiful! Studio contacted me quickly on WhatsApp and the whole process was smooth.", rating: 5 },
  { name: "Kiran B.", location: "Kukatpally", text: "Passport photos were done perfectly and delivered the same day. Highly recommend!", rating: 5 },
  { name: "Meena R.", location: "Banjara Hills", text: "Snap & Print at our family function was such a hit! Everyone loved the instant prints.", rating: 5 },
  { name: "Arun V.", location: "HITEC City", text: "Ordered photo prints for my office — sharp, vibrant, and packed really well.", rating: 5 },
  { name: "Lakshmi P.", location: "Kondapur", text: "Received my framed print within hours. The lamination finish looks premium. Great value!", rating: 5 },
];


const whyChoose = [
  { icon: <Shield size={18} className="text-blue-600" />, line1: "Premium Quality", line2: "Prints & Products" },
  { icon: <Truck size={18} className="text-blue-600" />, line1: "Fast & Safe", line2: "Delivery" },
  { icon: <ShieldCheck size={18} className="text-blue-600" />, line1: "Secure", line2: "Payments" },
  { icon: <Headset size={18} className="text-blue-600" />, line1: "Customer", line2: "Support" },
];

const quickLinks = [
  { label: "Home", path: "/" },
  { label: "Services", path: "/studio" },
  { label: "Print Now", path: "/studio/photocopies" },
  { label: "Frames", path: "/studio/frames" },
  { label: "Mini Albums", path: "/studio/album" },
  { label: "About", path: "/about" },
];

const supportLinks = ["Help & FAQ", "Shipping & Delivery", "Terms & Conditions", "Privacy Policy", "Contact Us"];

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const API_URL = API_BASE.endsWith('/api/v1') ? API_BASE : `${API_BASE}/api/v1`;

export default function HomePage() {
  const navigate = useNavigate();
  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const [email, setEmail] = useState("");
  const [newsletterLoading, setNewsletterLoading] = useState(false);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [heroSlide, setHeroSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setHeroSlide((i) => (i + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setReviewsOpen(false);
    };
    if (reviewsOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [reviewsOpen]);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setNewsletterLoading(true);
    try {
      const res = await fetch(`${API_URL}/newsletter/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Subscribed! Check your inbox for a confirmation.', { duration: 4000 });
        setEmail('');
      } else {
        toast.error(data?.message || 'Something went wrong. Please try again.');
      }
    } catch {
      toast.error('Unable to subscribe right now. Please try again later.');
    } finally {
      setNewsletterLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-800">
      <Navbar />

      {/* ─── HERO ──────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden min-h-[560px] md:min-h-[640px] flex flex-col"
        style={{ backgroundColor: '#DCEEFC' }}
      >
        {/* Crossfading background slides */}
        {heroSlides.map((slide, i) => (
          <div
            key={slide.img}
            role="img"
            aria-label={slide.alt}
            className={`absolute inset-0 transition-opacity duration-1000 ${i === heroSlide ? 'opacity-100' : 'opacity-0'}`}
            style={{
              backgroundImage: `url(${slide.img})`,
              backgroundSize: 'cover',
              backgroundPosition: 'right center',
              backgroundRepeat: 'no-repeat',
            }}
          />
        ))}

        {/* Fade overlay so text stays legible over the photo */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(90deg, #DCEEFC 0%, rgba(220,238,252,0.95) 28%, rgba(220,238,252,0.55) 48%, rgba(220,238,252,0.1) 65%, transparent 80%)',
          }}
        />
        <div
          className="absolute inset-0 md:hidden"
          style={{ background: 'linear-gradient(180deg, rgba(220,238,252,0.65) 0%, rgba(220,238,252,0.9) 55%, #DCEEFC 100%)' }}
        />

        <div className="relative flex-1 flex items-center max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-20 w-full">
          <div className="max-w-xl">
            {/* Location pill */}
            <div className="inline-flex items-center gap-1.5 bg-white border border-blue-100 text-blue-600 text-xs font-semibold px-3.5 py-1.5 rounded-full mb-6 shadow-sm tracking-wide">
              <MapPin size={13} />
              HELLO HYDERABAD
            </div>

            <h1 className="font-black leading-[1.08] tracking-tight mb-5 text-slate-900" style={{ fontSize: 'clamp(2.4rem, 5vw, 3.6rem)' }}>
              <span className="block">Your Photos.</span>
              <span className="block">Our Print.</span>
              <span className="block text-blue-600">Delivered to You.</span>
            </h1>

            <p className="text-slate-600 text-base md:text-lg mb-7 max-w-md leading-relaxed">
              Prints, frames, albums, gifts &amp; more — all in one place. No wait. No rush.
            </p>

            {/* Trust icon row */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mb-8">
              {[
                { icon: <Shield size={16} className="text-blue-600" />, label: 'Premium Quality' },
                { icon: <Truck size={16} className="text-blue-600" />, label: 'Fast & Safe Delivery' },
                { icon: <BadgePercent size={16} className="text-blue-600" />, label: 'Best Prices & Offers' },
              ].map((c) => (
                <span key={c.label} className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
                  {c.icon} {c.label}
                </span>
              ))}
            </div>

            {/* CTA */}
            <button
              className="flex items-center gap-2 bg-blue-600 text-white px-7 py-3.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20"
              onClick={() => navigate("/studio/photocopies")}
            >
              Start Printing <ArrowRight size={15} />
            </button>
          </div>
        </div>

        {/* Carousel dots */}
        <div className="relative flex justify-center gap-1.5 pb-8 md:pb-10">
          {heroSlides.map((slide, i) => (
            <button
              key={slide.img}
              aria-label={`Show slide ${i + 1}`}
              onClick={() => setHeroSlide(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === heroSlide ? "w-5 bg-blue-600" : "w-1.5 bg-blue-200 hover:bg-blue-300"
              }`}
            />
          ))}
        </div>
      </section>

      {/* ─── SERVICES ──────────────────────────────────────────────────────── */}
      <section className="py-14 md:py-20 bg-[#F5F9FD]">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight mb-1.5">
            Our Services
          </h2>
          <p className="text-slate-500 text-sm mb-8">
            Everything you need to capture, print and preserve your memories.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
            {iconServices.map((svc) => (
              <div
                key={svc.id}
                className="group flex flex-col bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden cursor-pointer"
                onClick={() => navigate(svc.path)}
              >
                <div className="p-3 pb-0">
                  <div className="h-52 rounded-xl overflow-hidden bg-slate-50">
                    <img
                      src={svc.img}
                      alt={svc.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                </div>
                <div className="flex flex-col flex-1 p-5">
                  <p className="font-bold text-lg text-slate-900 leading-snug mb-1.5">{svc.title}</p>
                  <p className="text-slate-500 text-sm leading-relaxed mb-5">{svc.desc}</p>
                  <span className="mt-auto inline-flex items-center gap-1.5 text-blue-600 text-sm font-semibold group-hover:gap-2.5 transition-all">
                    Explore <ArrowRight size={14} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SPECIAL COMBOS & OFFERS ──────────────────────────────────────────── */}
      <section className="py-14 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight mb-1.5">
                Special Combos &amp; Offers
              </h2>
              <p className="text-slate-400 text-sm">More value. More memories. Handpicked just for you.</p>
            </div>
            <button
              className="hidden md:flex items-center gap-1.5 text-blue-600 text-sm font-semibold hover:underline flex-shrink-0 ml-4"
              onClick={() => navigate("/studio")}
            >
              View All <ArrowRight size={14} />
            </button>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 snap-x snap-mandatory scrollbar-hide">
            {combos.map((c) => (
              <div
                key={c.title}
                className="flex-shrink-0 w-56 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden snap-start"
              >
                <div className="h-36 overflow-hidden">
                  <img src={c.img} alt={c.title} className="w-full h-full object-cover" />
                </div>
                <div className="p-4">
                  <p className="font-semibold text-sm text-slate-900 leading-snug mb-1">{c.title}</p>
                  <p className="text-blue-600 font-bold text-sm mb-3">From {c.price}</p>
                  <button
                    className="flex items-center gap-1 text-slate-600 text-xs font-semibold hover:text-blue-600 transition-colors"
                    onClick={() => navigate(c.path)}
                  >
                    View Details <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex md:hidden justify-center">
            <button
              className="flex items-center gap-2 text-blue-600 text-sm font-semibold border border-blue-200 px-5 py-2.5 rounded-full hover:bg-blue-50 transition-colors"
              onClick={() => navigate("/studio")}
            >
              View All Offers <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </section>

      {/* ─── BOOK A PHOTOGRAPHER ──────────────────────────────────────────────── */}
      <section className="py-14 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div
            className="relative overflow-hidden rounded-3xl text-white"
            style={{ background: 'linear-gradient(135deg, #080d1a 0%, #0f1628 45%, #0d1f3c 100%)' }}
          >
            <img
              src={photographerBg}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(100deg, #080d1a 0%, rgba(8,13,26,0.92) 30%, rgba(8,13,26,0.55) 50%, rgba(8,13,26,0.15) 70%, transparent 100%)' }}
            />

            {/* Sticky badge */}
            <div
              className="absolute top-5 right-5 md:top-7 md:right-7 text-slate-900 text-[11px] font-bold px-3 py-2 rounded-lg shadow-lg leading-tight text-center z-10"
              style={{ background: '#FDE68A', transform: 'rotate(4deg)' }}
            >
              Capture<br />Print<br />Cherish
            </div>

            <div className="relative grid grid-cols-1 lg:grid-cols-[1.35fr_0.65fr] gap-6 lg:gap-8 p-6 md:p-8">
              {/* Left: info */}
              <div>
                <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center mb-4">
                  <Camera size={17} />
                </div>
                <h2 className="text-white text-xl md:text-2xl font-bold leading-tight mb-2.5">
                  Book a Photographer
                  <br />
                  For Your Small Events
                </h2>
                <p className="text-gray-300 text-sm leading-relaxed mb-4 max-w-sm">
                  From birthdays at home to family gatherings, we bring a professional
                  photographer to your doorstep.
                </p>

                <div className="flex flex-wrap gap-x-5 gap-y-3 mb-4">
                  {eventTypes.map((e) => (
                    <div key={e.label} className="flex flex-col items-center gap-1 text-center w-16">
                      <e.icon size={18} className="text-blue-300" />
                      <p className="text-[10px] text-gray-400 leading-tight">{e.label}</p>
                    </div>
                  ))}
                </div>

                <button
                  className="flex items-center gap-1.5 text-blue-300 text-sm font-semibold hover:text-blue-200 transition-colors"
                  onClick={() => navigate("/contact")}
                >
                  View Packages <ArrowRight size={14} />
                </button>
              </div>

              {/* Right: pricing card */}
              <div className="bg-white text-slate-900 rounded-2xl p-5 self-center shadow-2xl">
                <p className="font-bold text-sm mb-3">Hourly Packages</p>
                <div className="space-y-2.5 mb-4">
                  {hourlyPackages.map((pkg) => (
                    <div key={pkg.duration} className="flex items-center gap-3 text-sm border-b border-slate-100 pb-2.5 last:border-0 last:pb-0">
                      <p className="font-medium text-slate-800 w-24 flex-shrink-0">{pkg.duration}</p>
                      <p className="font-bold text-blue-600 w-20 flex-shrink-0">{pkg.price}</p>
                      {pkg.extra && (
                        <p className="text-[10px] text-slate-400 leading-tight">{pkg.extra}</p>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors"
                  onClick={() => navigate("/contact")}
                >
                  Book Now <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── WHY CHOOSE ────────────────────────────────────────────────────── */}
      <section className="py-6 md:py-10 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div
            className="rounded-2xl md:rounded-3xl px-6 md:px-10 py-6 md:py-7 flex flex-col md:flex-row items-center md:justify-between gap-6 md:gap-8"
            style={{ background: 'linear-gradient(90deg, #EAF1FC 0%, #F7FAFE 55%, #FFFFFF 100%)' }}
          >
            {/* Heading */}
            <div className="text-center md:text-left flex-shrink-0">
              <h2 className="text-lg md:text-xl font-bold text-slate-900 leading-tight">
                Why Choose Pozhi?
              </h2>
              <p className="text-slate-500 text-xs mt-0.5">
                Simple. Reliable. Always for Your Memories.
              </p>
            </div>

            {/* Feature icons */}
            <div className="flex flex-wrap justify-center md:justify-start gap-5 md:gap-7">
              {whyChoose.map((w) => (
                <div key={w.line1} className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
                    {w.icon}
                  </div>
                  <p className="font-semibold text-[11px] text-slate-800 leading-snug">
                    {w.line1}
                    <br />
                    {w.line2}
                  </p>
                </div>
              ))}
            </div>

            {/* Script note */}
            <div className="hidden lg:flex items-end gap-1 flex-shrink-0 text-right">
              <p className="font-script text-2xl text-slate-800 leading-[1.15]">
                Because every
                <br />
                photo has a story…
              </p>
              <Heart size={16} className="text-blue-400 mb-1 flex-shrink-0" />
            </div>
          </div>
        </div>
      </section>

      {/* ─── CLOSING CTA ───────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden text-white"
        style={{ background: 'linear-gradient(120deg, #1e3a8a 0%, #2563eb 100%)' }}
      >
        <div className="relative max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-16 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex gap-2 md:gap-3 order-2 md:order-1">
            {[framesImg, albumImg, photocopiesImg].map((img, i) => (
              <img
                key={i}
                src={img}
                alt=""
                className="w-16 h-20 md:w-20 md:h-28 object-cover rounded-lg border-2 border-white/30 shadow-lg"
                style={{ transform: `rotate(${(i - 1) * 6}deg)` }}
              />
            ))}
          </div>
          <div className="text-center md:text-left order-1 md:order-2">
            <h2 className="text-white text-2xl md:text-3xl font-bold leading-tight mb-2">
              Your Memories Deserve the Best
            </h2>
            <p className="text-blue-100 text-sm md:text-base mb-6">
              Print it. Frame it. Gift it. Capture it.
            </p>
            <button
              className="inline-flex items-center gap-2 bg-white text-blue-700 px-7 py-3.5 rounded-xl font-bold text-sm hover:bg-blue-50 transition-colors shadow-xl"
              onClick={() => navigate("/studio")}
            >
              Start Your Order <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ──────────────────────────────────────────────────── */}
      <section className="py-16 md:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
                Happy Customers
              </h2>
              <p className="text-gray-400 text-sm">Real stories. Real smiles.</p>
            </div>
            <button
              className="hidden md:flex items-center gap-1.5 text-blue-600 text-sm font-semibold hover:underline"
              onClick={() => setReviewsOpen(true)}
            >
              View More Reviews <ArrowRight size={14} />
            </button>
          </div>

          {/* Desktop: 3 cards side by side */}
          <div className="hidden md:grid grid-cols-3 gap-6">
            {testimonials.slice(0, 3).map((t) => (
              <div key={t.name} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex gap-1 mb-3">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} size={13} className="text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-5">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900">— {t.name}</p>
                    <p className="text-gray-400 text-xs">{t.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile: carousel */}
          <div className="md:hidden">
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex gap-1 mb-3">
                {Array.from({ length: testimonials[testimonialIdx].rating }).map((_, i) => (
                  <Star key={i} size={13} className="text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <p className="text-gray-600 text-sm leading-relaxed mb-5">
                "{testimonials[testimonialIdx].text}"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {testimonials[testimonialIdx].name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-900">
                    — {testimonials[testimonialIdx].name}
                  </p>
                  <p className="text-gray-400 text-xs">{testimonials[testimonialIdx].location}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 mt-5">
              <button
                onClick={() => setTestimonialIdx((i) => (i - 1 + testimonials.length) % testimonials.length)}
                className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="flex gap-2">
                {testimonials.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setTestimonialIdx(i)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      i === testimonialIdx ? "bg-blue-600" : "bg-gray-300"
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={() => setTestimonialIdx((i) => (i + 1) % testimonials.length)}
                className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ────────────────────────────────────────────────────────── */}
      <footer className="bg-gray-900 text-white pt-14 pb-6">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">

            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <button
                className="flex items-center gap-2.5 mb-4"
                onClick={() => navigate("/")}
              >
                <img src={logoImg} alt="Pozhi" className="h-9 w-9 object-contain rounded-lg" />
                <div className="text-left">
                  <div className="text-white font-bold text-xl leading-none">pozhi</div>
                  <div className="text-gray-400 text-[10px] tracking-wide">Print · Frame · Preserve</div>
                </div>
              </button>
              <p className="text-gray-400 text-sm leading-relaxed mb-5">
                Your trusted photo studio in Hyderabad. Prints, frames, albums and more.
              </p>
              <div className="flex items-center gap-3">
                {[
                  { icon: <Instagram size={14} />, label: "Instagram", href: "https://www.instagram.com/pozhi.in?xtok=MWhzMDhkOWRsOXgxdQ%3D%3D&utm_source=qr" },
                  { icon: <Youtube size={14} />, label: "YouTube", href: "https://www.youtube.com/" },
                ].map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-blue-600 flex items-center justify-center transition-colors"
                  >
                    {s.icon}
                  </a>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-xs font-bold text-white mb-4 uppercase tracking-widest">
                Quick Links
              </h3>
              <ul className="space-y-2.5">
                {quickLinks.map((link) => (
                  <li key={link.label}>
                    <button
                      onClick={() => navigate(link.path)}
                      className="text-gray-400 text-sm hover:text-white transition-colors"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="text-xs font-bold text-white mb-4 uppercase tracking-widest">
                Support
              </h3>
              <ul className="space-y-2.5">
                {supportLinks.map((label) => (
                  <li key={label}>
                    <button
                      onClick={() => navigate("/contact")}
                      className="text-gray-400 text-sm hover:text-white transition-colors text-left"
                    >
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Newsletter */}
            <div>
              <h3 className="text-xs font-bold text-white mb-4 uppercase tracking-widest">
                Get Updates
              </h3>
              <p className="text-gray-400 text-sm mb-4 leading-relaxed">
                Be the first to know about offers and new services.
              </p>
              <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="flex-1 bg-white/10 border border-white/15 text-white placeholder-gray-500 text-sm px-3 py-2 rounded-lg outline-none focus:border-blue-500 transition-colors min-w-0"
                />
                <button
                  type="submit"
                  disabled={newsletterLoading}
                  className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {newsletterLoading
                    ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin block" />
                    : <ArrowRight size={15} />
                  }
                </button>
              </form>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-2 text-sm text-gray-500">
            <span>© 2025 Pozhi. All rights reserved.</span>
            <span>Made with ♥ for your memories</span>
          </div>
        </div>
      </footer>
      {/* ─── REVIEWS MODAL ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {reviewsOpen && (
          <>
            <motion.div
              key="reviews-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
              onClick={() => setReviewsOpen(false)}
            />
            <motion.div
              key="reviews-modal"
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-0 z-[201] flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
                  <div>
                    <h2 className="font-bold text-gray-900 text-lg">Customer Reviews</h2>
                    <p className="text-gray-400 text-xs mt-0.5">
                      {testimonials.length} verified reviews · 5.0 ★
                    </p>
                  </div>
                  <button
                    onClick={() => setReviewsOpen(false)}
                    className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    aria-label="Close reviews"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Reviews grid */}
                <div className="overflow-y-auto flex-1 p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {testimonials.map((t) => (
                      <div
                        key={t.name}
                        className="bg-gray-50 rounded-xl p-4 border border-gray-100"
                      >
                        <div className="flex gap-1 mb-2">
                          {Array.from({ length: t.rating }).map((_, i) => (
                            <Star key={i} size={11} className="text-yellow-400 fill-yellow-400" />
                          ))}
                        </div>
                        <p className="text-gray-600 text-sm leading-relaxed mb-4">"{t.text}"</p>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                            {t.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-xs text-gray-900">{t.name}</p>
                            <p className="text-gray-400 text-[11px]">{t.location}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer CTA */}
                <div className="border-t border-gray-100 px-6 py-4 flex-shrink-0 text-center">
                  <p className="text-gray-400 text-xs">
                    Showing all {testimonials.length} reviews · 100% authentic customer feedback
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
