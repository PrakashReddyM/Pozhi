import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarCheck, AlertCircle, Loader2, ArrowLeft, Info, MapPin, ShieldCheck, Zap, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { useAddToCart } from "@/hooks/useAddToCart";
import RadarVisual from "@/components/snapnprint/RadarVisual";
import CategoryToggle from "@/components/snapnprint/CategoryToggle";
import TicketCard from "@/components/snapnprint/TicketCard";
import { fetchSnapnPrintPricing, type SnapnPrintCategory, fetchBookedSlots } from "@/services/api";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { toast } from "sonner";
import type { SnapCategory } from "@/lib/snapnprint-data";

const TIME_SLOTS = [
  "10:00 AM", "11:00 AM", "12:00 PM",
  "01:00 PM", "02:00 PM", "03:00 PM",
  "04:00 PM", "05:00 PM", "06:00 PM"
];

const SnapnPrint = () => {
  const navigate = useNavigate();
  const { addToCart } = useAddToCart();
  const [snapCategories, setSnapCategories] = useState<SnapnPrintCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<SnapCategory>("individual");
  const [selectedPackageIds, setSelectedPackageIds] = useState<Record<string, string>>({});
  const [referenceImage, setReferenceImage] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | undefined>(undefined);
  const [bookedSlots, setBookedSlots] = useState<Record<string, string[]>>({});

  // Clear selected time if it's already booked on the new date
  useEffect(() => {
    if (selectedDate && selectedTime) {
      const dateKey = format(selectedDate, "yyyy-MM-dd");
      if (bookedSlots[dateKey]?.includes(selectedTime)) {
        setSelectedTime(undefined);
      }
    }
  }, [selectedDate, bookedSlots, selectedTime]);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [pricingData, bookedData] = await Promise.all([
          fetchSnapnPrintPricing(),
          fetchBookedSlots()
        ]);

        setSnapCategories(pricingData);
        setBookedSlots(bookedData);

        if (pricingData.length > 0) {
          setSelectedCategory(pricingData[0].id as SnapCategory);
          const initial: Record<string, string> = {};
          pricingData.forEach((cat) => {
            if (cat.packages.length > 0) {
              initial[cat.id] = cat.packages[0].id;
            }
          });
          setSelectedPackageIds(initial);
        }
      } catch (err) {
        console.error("Failed to load snapnprint data:", err);
        setError("Inbound link failure. Unable to synchronize deployment ledger.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const isSlotBooked = (time: string) => {
    if (!selectedDate) return false;
    const dateKey = format(selectedDate, "yyyy-MM-dd");
    return bookedSlots[dateKey]?.includes(time);
  };

  const currentCategoryData = useMemo(
    () => snapCategories.find((c) => c.id === selectedCategory),
    [snapCategories, selectedCategory]
  );

  const currentPackage = useMemo(
    () =>
      currentCategoryData?.packages.find(
        (p) => p.id === selectedPackageIds[selectedCategory]
      ),
    [currentCategoryData, selectedPackageIds, selectedCategory]
  );

  const handlePackageSelect = (pkgId: string) => {
    setSelectedPackageIds((prev) => ({ ...prev, [selectedCategory]: pkgId }));
  };

  const handleBookNow = async () => {
    if (!currentCategoryData || !currentPackage) return;

    if (!selectedDate) {
      toast.error("Deployment date required", {
        description: "Please select a preferred date for the mobile atelier mobilization.",
        position: "top-center"
      });
      return;
    }

    if (!selectedTime) {
      toast.error("Time slot required", {
        description: "Please select a tactical window for our team to arrive.",
        position: "top-center"
      });
      return;
    }

    // A booking holds a specific slot, so it goes straight to checkout rather than
    // sitting in the cart where the slot could be taken in the meantime.
    await addToCart(
      {
        service: "SnapnPrint",
        title: `${currentCategoryData.label} — ${currentPackage.label}`,
        description: `${format(selectedDate, "d MMM")} · ${selectedTime}`,
        price: currentPackage.price,
        priceField: "snapnprint_package_id",
        priceId: currentPackage.packageId,
        details: {
          "Service Type": currentCategoryData.label,
          Package: currentPackage.label,
          "Scheduled Date": format(selectedDate, "PPP"),
          "Arrival Window": selectedTime,
        },
        bookingDate: format(selectedDate, "yyyy-MM-dd"),
        bookingTime: selectedTime,
      },
      { thenCheckout: true }
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="relative">
          <Loader2 className="w-10 h-10 animate-spin text-foreground/10" />
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-foreground" />
          </motion.div>
        </div>
        <p className="mt-8 text-[10px] tracking-[0.6em] uppercase text-muted-foreground/40 font-body font-bold">
          Setting the stage...
        </p>
      </div>
    );
  }

  if (error || !currentCategoryData || !currentPackage) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-[32px] bg-foreground/[0.03] border border-foreground/[0.05] flex items-center justify-center mx-auto mb-10">
            <Info className="w-6 h-6 text-foreground/20" />
          </div>
          <h2 className="text-3xl font-heading font-black text-heading mb-4 tracking-tight">Something went wrong.</h2>
          <p className="text-xs text-muted-foreground mb-12 font-body leading-relaxed uppercase tracking-widest opacity-60">
            {error || "We're having trouble connecting to the studio."}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-12 py-5 bg-foreground text-background text-[10px] font-black tracking-[0.4em] uppercase rounded-full hover:bg-black transition-all cursor-pointer shadow-2xl"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar visible={true} />

      {/* Redundant background removed — handled by ThemeLayout */}

      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="pt-24 pb-40 md:pt-40 md:pb-40 px-6 md:px-12 relative z-10"
      >
        <div className="max-w-7xl mx-auto">
          {/* Header Section — Editorial High Contrast */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-16 md:mb-24 gap-10 md:gap-16">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-2xl"
            >
              <button
                onClick={() => navigate("/studio")}
                className="group flex items-center gap-3 text-[10px] text-muted-foreground/60 font-body font-bold tracking-[0.4em] uppercase mb-8 md:mb-12 hover:text-foreground transition-all cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3 group-hover:-translate-x-2 transition-transform" />
                Return to Atelier
              </button>
              <h1 className="text-5xl md:text-8xl font-heading font-black text-heading leading-[0.9] md:leading-[0.85] tracking-tighter mb-6 md:mb-8">
                Snap n' <br /> <span className="text-foreground/20 italic">Print.</span>
              </h1>
              <p className="text-xs md:text-base text-muted-foreground/60 leading-relaxed font-body max-w-sm">
                Mobile studio elite deployment. We intercept your location for artisanal capture and immediate physical archival delivery.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.3 }}
              className="flex flex-col items-start lg:items-end gap-3 border-t border-foreground/5 lg:border-none pt-8 lg:pt-0"
            >
              <div className="flex items-center gap-3 mb-1 opacity-20">
                <Zap className="w-3 h-3 fill-current" />
                <span className="text-[10px] text-foreground tracking-[0.5em] uppercase font-body font-bold">Tier Premium</span>
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentPackage.price}
                  initial={{ y: 20, opacity: 0, filter: "blur(5px)" }}
                  animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                  exit={{ y: -20, opacity: 0, filter: "blur(5px)" }}
                  className="flex items-baseline gap-4"
                >
                  <span className="text-xl md:text-2xl font-heading italic text-foreground/20 tracking-tighter uppercase font-black">Session</span>
                  <span className="text-5xl md:text-8xl font-heading font-black text-heading tabular-nums tracking-tighter shadow-black/[0.02]">
                    ₹{currentPackage.price.toLocaleString()}
                  </span>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>

          <div className="h-px w-full bg-foreground/[0.03] mb-24 shadow-sm" />

          {/* Grid Layout Configuration */}
          <div className="grid lg:grid-cols-[1fr_1fr] gap-16 lg:gap-32 items-start">
            {/* Visualization Hub — Tactical Radar */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.2, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="lg:sticky lg:top-40 h-fit"
            >
              <div className="flex items-center gap-4 mb-10">
                <div className="w-10 h-px bg-foreground/10" />
                <h4 className="text-[10px] font-body font-bold text-foreground/20 uppercase tracking-[0.4em]">Tactical Feed // Radar</h4>
              </div>
              <RadarVisual
                category={selectedCategory}
              />
            </motion.div>

            {/* Configurator Column */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-24"
            >
              {/* Deployment Strategy Section */}
              <section>
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-10 h-10 rounded-[14px] bg-foreground/[0.03] border border-foreground/[0.05] flex items-center justify-center text-[11px] font-heading font-black text-heading">01</div>
                  <h3 className="text-xs font-heading font-black text-heading uppercase tracking-[0.3em]">Deployment Strategy</h3>
                </div>
                <CategoryToggle
                  categories={snapCategories}
                  selected={selectedCategory}
                  onSelect={(id) => setSelectedCategory(id as SnapCategory)}
                />
              </section>

              {/* Service Tier Section */}
              <section>
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-10 h-10 rounded-[14px] bg-foreground/[0.03] border border-foreground/[0.05] flex items-center justify-center text-[11px] font-heading font-black text-heading">02</div>
                  <h3 className="text-xs font-heading font-black text-heading uppercase tracking-[0.3em]">Service Tier Yields</h3>
                </div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedCategory}
                    initial={{ opacity: 0, x: -20, filter: "blur(5px)" }}
                    animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, x: 20, filter: "blur(5px)" }}
                    transition={{ duration: 0.6 }}
                    className="space-y-6"
                  >
                    {currentCategoryData.packages.map((pkg, index) => (
                      <TicketCard
                        key={pkg.id}
                        pkg={pkg}
                        isSelected={currentPackage.id === pkg.id}
                        onSelect={() => handlePackageSelect(pkg.id)}
                        index={index}
                      />
                    ))}
                  </motion.div>
                </AnimatePresence>
              </section>

              {/* Deployment Schedule Section */}
              <section>
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-10 h-10 rounded-[14px] bg-foreground/[0.03] border border-foreground/[0.05] flex items-center justify-center text-[11px] font-heading font-black text-heading">03</div>
                  <h3 className="text-xs font-heading font-black text-heading uppercase tracking-[0.3em]">Schedule Your Time</h3>
                </div>

                <div className="flex flex-col xl:flex-row gap-8">
                  {/* Calendar View */}
                  <div className="flex-1 bg-foreground/[0.02] border border-foreground/[0.03] rounded-[32px] p-6 flex justify-center">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => date < new Date() || date < new Date("1900-01-01")}
                      className="rounded-md border-none"
                    />
                  </div>

                  {/* Time Slots */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3 mb-6 px-2">
                      <Clock className="w-4 h-4 text-foreground/40" />
                      <span className="text-[10px] font-body font-bold text-foreground/40 uppercase tracking-[0.2em]">Available Slots</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {TIME_SLOTS.map((time) => {
                        const isBooked = isSlotBooked(time);
                        return (
                          <button
                            key={time}
                            disabled={isBooked}
                            onClick={() => setSelectedTime(time)}
                            className={`py-4 px-4 rounded-2xl text-[10px] font-heading font-black tracking-[0.1em] uppercase transition-all border ${selectedTime === time
                                ? "bg-foreground text-background border-foreground shadow-lg scale-[1.02]"
                                : isBooked
                                  ? "bg-foreground/[0.01] text-foreground/10 border-foreground/5 cursor-not-allowed"
                                  : "bg-foreground/[0.02] text-foreground/40 border-foreground/5 hover:border-foreground/20"
                              }`}
                          >
                            {time}
                            {isBooked && (
                              <span className="block mt-1 text-[8px] opacity-40">Booked</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>


              {/* Deployment Information & Action */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="relative p-8 md:p-12 rounded-[40px] bg-foreground/[0.02] border border-foreground/[0.05] overflow-hidden group shadow-black/[0.01]"
              >
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                  <MapPin className="w-20 h-20 text-foreground" />
                </div>
                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-12">
                  <div className="flex items-start gap-8">
                    <div className="w-14 h-14 rounded-2xl bg-foreground text-background flex items-center justify-center shrink-0 shadow-xl shadow-black/10">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[11px] font-heading font-black text-heading uppercase tracking-[0.2em] mb-3">Mobilization Ledger</p>
                      <h4 className="text-xl font-heading font-black text-heading tracking-tight mb-4">Direct On-Site Yield.</h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 opacity-40">
                          <div className="w-1.5 h-1.5 rounded-full bg-foreground" />
                          <span className="text-[10px] font-body font-bold uppercase tracking-widest">Real-time Capture</span>
                        </div>
                        <div className="flex items-center gap-3 opacity-40">
                          <div className="w-1.5 h-1.5 rounded-full bg-foreground" />
                          <span className="text-[10px] font-body font-bold uppercase tracking-widest">Immediate Physical Print</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleBookNow}
                    className="group relative px-12 py-6 bg-foreground text-background text-[10px] font-black tracking-[0.4em] uppercase rounded-full hover:bg-black transition-all cursor-pointer shadow-2xl flex items-center gap-3"
                  >
                    <CalendarCheck className="w-4 h-4" />
                    Confirm Booking
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </motion.main>
    </>
  );
};

export default SnapnPrint;
