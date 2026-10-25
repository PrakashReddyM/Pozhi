import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, Loader2, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAddToCart } from "@/hooks/useAddToCart";
import Navbar from "@/components/Navbar";
import BookPreview from "@/components/album/BookPreview";
import CapacitySelector from "@/components/album/CapacitySelector";
import CoverTypeToggle from "@/components/album/CoverTypeToggle";
import CoverUploadZone from "@/components/album/CoverUploadZone";
import { fetchAlbumPricing, type AlbumCapacity, type ChunkedUploadProgress } from "@/services/api";
import ContentImagePicker, { type ContentImage } from "@/components/album/ContentImagePicker";
import { toast } from "sonner";

export type CoverType = "basic" | "custom";

const Album = () => {
  const navigate = useNavigate();
  const { addToCart, isAdding } = useAddToCart();

  // API State
  const [albumCapacities, setAlbumCapacities] = useState<AlbumCapacity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedCapacityId, setSelectedCapacityId] = useState("");
  const [coverType, setCoverType] = useState<CoverType>("basic");
  const [frontImage, setFrontImage] = useState<{url: string, file: File} | null>(null);
  const [backImage, setBackImage] = useState<{url: string, file: File} | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [contentImages, setContentImages] = useState<ContentImage[]>([]);
  const [uploadProgress, setUploadProgress] = useState<ChunkedUploadProgress | null>(null);

  // Fetch pricing
  useEffect(() => {
    async function loadPricing() {
      try {
        setLoading(true);
        const data = await fetchAlbumPricing();
        setAlbumCapacities(data);
        if (data.length > 0) {
          setSelectedCapacityId(data[0].id);
        }
      } catch (err) {
        console.error("Failed to load pricing:", err);
        setError("Failed to load pricing. Please try again later.");
      } finally {
        setLoading(false);
      }
    }
    loadPricing();
  }, []);

  const currentCapacity = useMemo(
    () => albumCapacities.find((c) => c.id === selectedCapacityId),
    [albumCapacities, selectedCapacityId]
  );

  // Switching to a smaller capacity can leave more content photos selected
  // than the new cap allows — trim back down, same pattern PhotoCopies uses
  // for its quantity-driven cap.
  useEffect(() => {
    if (currentCapacity && contentImages.length > currentCapacity.images) {
      setContentImages((prev) => prev.slice(0, currentCapacity.images));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCapacity]);

  const handleCoverTypeChange = (type: CoverType) => {
    setCoverType(type);
    if (type === "basic") {
      setFrontImage(null);
      setBackImage(null);
      setIsFlipped(false);
    }
  };

  const buildCartItem = () => {
    if (!currentCapacity) return null;

    if (coverType === "custom" && (!frontImage || !backImage)) {
      toast.error("Please upload both front and back cover images", {
        description: "Custom covers require both images to be provided.",
        position: "top-center",
      });
      return null;
    }

    const coverLabel = coverType === "basic" ? "Basic Design" : "Custom Upload";

    // Position convention for order_item_uploads: covers first (front, then
    // back, only when custom), content images after — there's no separate
    // "kind" column, so admin/fulfillment rely on this fixed ordering.
    const coverFiles = [frontImage?.file, backImage?.file].filter(Boolean) as File[];
    const contentFiles = contentImages.map((i) => i.file);

    return {
      service: "Album",
      title: `Premium Album — ${currentCapacity.label}`,
      description: `${currentCapacity.label} · ${coverLabel}`,
      price: currentCapacity.price,
      priceField: "album_capacity_id",
      priceId: currentCapacity.capacityId,
      details: {
        Capacity: currentCapacity.label,
        Cover: coverLabel,
        ...(contentImages.length ? { "Content Photos Uploaded": String(contentImages.length) } : {}),
      },
      files: [...coverFiles, ...contentFiles],
      onUploadProgress: setUploadProgress,
    };
  };

  const handleAddToCart = async () => {
    setUploadProgress(null);
    const item = buildCartItem();
    if (item) await addToCart(item);
  };

  const handleBuyNow = async () => {
    setUploadProgress(null);
    const item = buildCartItem();
    if (item) await addToCart(item, { thenCheckout: true });
  };

  // Loading State
  if (loading) {
    return (
      <>
        <Navbar visible={true} />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-lg text-muted-foreground">Loading pricing...</p>
          </div>
        </div>
      </>
    );
  }

  // Error State
  if (error || !currentCapacity) {
    return (
      <>
        <Navbar visible={true} />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center max-w-md px-4">
            <h2 className="text-2xl font-bold mb-4">Oops!</h2>
            <p className="text-muted-foreground mb-6">{error || "Something went wrong"}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
            >
              Try Again
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar visible={true} />

      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="pt-24 pb-40 px-4 md:px-8 lg:px-12"
      >
        <div className="max-w-6xl mx-auto">
          {/* Split layout */}
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
            {/* Left Column — Book Preview (sticky on desktop) */}
            <motion.div
              initial={{ opacity: 0, x: -40, rotateY: -10 }}
              animate={{ opacity: 1, x: 0, rotateY: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] as const }}
              className="lg:w-[45%] lg:sticky lg:top-24 lg:self-start"
            >
              <BookPreview
                isFlipped={isFlipped}
                coverType={coverType}
                frontImage={frontImage?.url || null}
                backImage={backImage?.url || null}
                onFlip={setIsFlipped}
              />
            </motion.div>

            {/* Right Column — Controls */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.7,
                delay: 0.15,
                ease: [0.22, 1, 0.36, 1] as const,
              }}
              className="lg:w-[55%] space-y-8"
            >
              {/* Header */}
              <div>
                <p className="text-sm font-medium text-primary tracking-[0.3em] uppercase mb-2">
                  Album
                </p>
                <h1 className="text-3xl md:text-4xl font-display font-extrabold text-heading leading-tight">
                  Handcrafted Premium Albums
                </h1>
              </div>

              {/* Dynamic Price */}
              <div className="flex items-baseline gap-3">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={currentCapacity.price}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="text-5xl md:text-6xl font-display font-extrabold text-foreground tabular-nums"
                  >
                    ₹{currentCapacity.price.toLocaleString()}
                  </motion.span>
                </AnimatePresence>
                <span className="text-sm text-muted-foreground font-medium">
                  for {currentCapacity.images} images
                </span>
              </div>

              {/* Step 1: Capacity */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Step 1 — Choose Capacity
                </p>
                <CapacitySelector
                  capacities={albumCapacities}
                  selectedId={selectedCapacityId}
                  onSelect={(cap) => setSelectedCapacityId(cap.id)}
                />
              </div>

              {/* Step 2: Cover Design */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Step 2 — Cover Design
                </p>
                <CoverTypeToggle
                  selected={coverType}
                  onSelect={handleCoverTypeChange}
                />
              </div>

              {/* Step 3: Content Photos — primary but optional */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Step 3 — Add Your Content Photos (Optional)
                </p>
                <ContentImagePicker
                  images={contentImages}
                  onChange={setContentImages}
                  maxImages={currentCapacity.images}
                  disabled={isAdding}
                />
              </div>

              {/* Fallback note — picker above is now the primary path, this just
                  keeps the WhatsApp-collection option alive for anyone who'd rather skip it. */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 border border-border/50">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Prefer not to upload here? No problem — skip this step and our team will
                  reach out on <strong>WhatsApp</strong> after you order to collect your
                  photos via Google Drive or Dropbox link.
                </p>
              </div>

              {/* Upload zones (only visible when "custom" is selected) */}
              <AnimatePresence>
                {coverType === "custom" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <CoverUploadZone
                        label="Front Cover"
                        image={frontImage?.url || null}
                        onUpload={(url, file) => setFrontImage({url, file})}
                        onClear={() => setFrontImage(null)}
                        onFocus={() => setIsFlipped(false)}
                      />
                      <CoverUploadZone
                        label="Back Cover"
                        image={backImage?.url || null}
                        onUpload={(url, file) => setBackImage({url, file})}
                        onClear={() => setBackImage(null)}
                        onFocus={() => setIsFlipped(true)}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* CTA — desktop */}
              <div className="hidden lg:flex gap-3 pt-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleAddToCart}
                  disabled={isAdding}
                  className="flex-1 flex items-center justify-center gap-2 py-4 px-6 border border-foreground/15 text-foreground font-display font-bold text-base rounded-xl hover:bg-foreground/[0.03] transition-colors disabled:opacity-60"
                >
                  {isAdding ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                  {isAdding && uploadProgress && uploadProgress.filesTotal > 0
                    ? `Uploading ${uploadProgress.filesDone}/${uploadProgress.filesTotal}…`
                    : "Add to Cart"}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleBuyNow}
                  disabled={isAdding}
                  className="flex-1 flex items-center justify-center gap-3 py-4 px-6 bg-primary text-primary-foreground font-display font-bold text-lg rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 disabled:opacity-60"
                >
                  {isAdding ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShoppingCart className="w-5 h-5" />}
                  {isAdding && uploadProgress && uploadProgress.filesTotal > 0
                    ? `Uploading ${uploadProgress.filesDone}/${uploadProgress.filesTotal}…`
                    : "Buy Now"}
                </motion.button>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.main>

      {/* Mobile sticky CTA */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-card/80 backdrop-blur-xl border-t border-border z-40 flex gap-2">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleAddToCart}
          disabled={isAdding}
          className="flex-shrink-0 flex items-center justify-center gap-2 py-4 px-5 border border-foreground/15 text-foreground font-display font-bold text-sm rounded-xl disabled:opacity-60"
        >
          {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Add
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleBuyNow}
          disabled={isAdding}
          className="flex-1 flex items-center justify-center gap-3 py-4 px-6 bg-primary text-primary-foreground font-display font-bold text-base rounded-xl shadow-md disabled:opacity-60"
        >
          {isAdding ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShoppingCart className="w-5 h-5" />}
          {isAdding && uploadProgress && uploadProgress.filesTotal > 0
            ? `Uploading ${uploadProgress.filesDone}/${uploadProgress.filesTotal}…`
            : `Buy Now — ₹${currentCapacity.price.toLocaleString()}`}
        </motion.button>
      </div>
    </>
  );
};

export default Album;

