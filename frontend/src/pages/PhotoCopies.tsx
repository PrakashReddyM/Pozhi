import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, Loader2, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { useAddToCart } from "@/hooks/useAddToCart";
import ModeTabs, { type CopyMode } from "@/components/photocopies/ModeTabs";
import CopyPreview, { type SelectedImage } from "@/components/photocopies/CopyPreview";
import SinglePhotoSelector from "@/components/photocopies/SinglePhotoSelector";
import SetPhotoSelector from "@/components/photocopies/SetPhotoSelector";
import { fetchPhotoCopiesPricing, type PhotoCopySingle, type PhotoCopySet } from "@/services/api";
import { toast } from "sonner";

const PhotoCopies = () => {
  const navigate = useNavigate();
  const { addToCart, isAdding } = useAddToCart();
  const [singleOptions, setSingleOptions] = useState<PhotoCopySingle[]>([]);
  const [setSizes, setSetSizes] = useState<PhotoCopySet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<CopyMode>("single");
  const [selectedSingleId, setSelectedSingleId] = useState("");
  const [selectedSetId, setSelectedSetId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);



  // Fetch pricing from API
  useEffect(() => {
    async function loadPricing() {
      try {
        setLoading(true);
        const data = await fetchPhotoCopiesPricing();
        setSingleOptions(data.single);
        setSetSizes(data.set);

        // Initialize selections
        if (data.single.length > 0) {
          setSelectedSingleId(data.single[0].id);
        }
        if (data.set.length > 0) {
          setSelectedSetId(data.set[0].id);
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

  const currentSingle = useMemo(
    () => singleOptions.find((o) => o.id === selectedSingleId),
    [singleOptions, selectedSingleId]
  );

  const currentSet = useMemo(
    () => setSizes.find((s) => s.id === selectedSetId),
    [setSizes, selectedSetId]
  );

  // Keep images within limit when changing modes/quantity
  useEffect(() => {
    const max = activeTab === "single" ? 1 : quantity * (currentSet?.copiesPerUnit || 1);
    if (selectedImages.length > max) {
      setSelectedImages(selectedImages.slice(0, max));
    }
  }, [activeTab, quantity, currentSet, selectedImages]);

  const totalPrice = useMemo(() => {
    if (activeTab === "single") return currentSingle?.price || 0;
    return (currentSet?.pricePerPiece || 0) * quantity;
  }, [activeTab, currentSingle, currentSet, quantity]);

  const currentAspectRatio =
    activeTab === "single" ? currentSingle?.aspectRatio : currentSet?.aspectRatio;
  const currentSizeLabel =
    activeTab === "single" ? currentSingle?.sizeLabel : currentSet?.sizeLabel;

  const buildCartItem = () => {
    if (!currentSingle && !currentSet) return null;

    if (selectedImages.length === 0) {
      toast.error("Please upload your photo first", {
        description: "An image is required to process your studio prints.",
        position: "top-center",
      });
      return null;
    }

    const isSingle = activeTab === "single";
    const copiesPerUnit = isSingle ? 1 : (currentSet?.copiesPerUnit ?? 1);
    const totalCopies = isSingle ? undefined : quantity * copiesPerUnit;

    const details: Record<string, string> = isSingle
      ? {
          Size: currentSingle?.sizeLabel || "",
          Pack: currentSingle?.copies || "",
        }
      : {
          Size: currentSet?.sizeLabel || "",
          Quantity: String(quantity),
          "Per Piece": `₹${currentSet?.pricePerPiece}`,
          ...(totalCopies && copiesPerUnit > 1
            ? { "Total Copies": String(totalCopies) }
            : {}),
        };

    return {
      service: "PhotoCopies",
      title: isSingle
        ? `${currentSingle?.sizeLabel} — ${currentSingle?.copies}`
        : `${currentSet?.sizeLabel} — Set of ${quantity}`,
      description: isSingle
        ? `${currentSingle?.sizeLabel} · ${currentSingle?.copies}`
        : `${currentSet?.sizeLabel} · ${quantity} set${quantity === 1 ? "" : "s"}`,
      // Unit price — the cart multiplies by quantity for the displayed line total.
      price: (isSingle ? currentSingle?.price : currentSet?.pricePerPiece) ?? 0,
      quantity: isSingle ? 1 : quantity,
      priceField: isSingle ? "photocopies_single_id" : "photocopies_set_id",
      priceId: isSingle ? currentSingle?.optionId : currentSet?.setId,
      details,
      files: selectedImages.map((img) => img.file),
    };
  };

  const handleAddToCart = async () => {
    const item = buildCartItem();
    if (item) await addToCart(item);
  };

  const handleBuyNow = async () => {
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
  if (error || !currentSingle || !currentSet) {
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
            {/* Left Column — Preview (sticky on desktop) */}
            <motion.div
              initial={{ opacity: 0, x: -40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] as const }}
              className="lg:w-[45%] lg:sticky lg:top-24 lg:self-start"
            >
              <CopyPreview
                aspectRatio={currentAspectRatio || "6/4"}
                sizeLabel={currentSizeLabel || ""}
                maxImages={activeTab === "single" ? 1 : quantity * (currentSet?.copiesPerUnit || 1)}
                selectedImages={selectedImages}
                onImagesSelect={setSelectedImages}
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
                  Photo Copies
                </p>
                <h1 className="text-3xl md:text-4xl font-display font-extrabold text-heading leading-tight">
                  Studio Quality Prints
                </h1>
              </div>

              {/* Dynamic Price */}
              <div className="flex items-baseline gap-3">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={totalPrice}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="text-5xl md:text-6xl font-display font-extrabold text-foreground tabular-nums"
                  >
                    ₹{totalPrice}
                  </motion.span>
                </AnimatePresence>
                <span className="text-sm text-muted-foreground font-medium">
                  {activeTab === "set"
                    ? `for ${quantity} ${quantity === 1 ? "piece" : "pieces"}`
                    : currentSingle.copies.toLowerCase()}
                </span>
              </div>

              {/* Mode Tabs */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Order Type
                </p>
                <ModeTabs activeTab={activeTab} onTabChange={setActiveTab} />
              </div>

              {/* Tab Content */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  {activeTab === "single" ? "Choose Option" : "Configure Set"}
                </p>

                <AnimatePresence mode="wait">
                  {activeTab === "single" ? (
                    <SinglePhotoSelector
                      key="single"
                      options={singleOptions}
                      selectedId={selectedSingleId}
                      onSelect={(opt) => setSelectedSingleId(opt.id)}
                    />
                  ) : (
                    <SetPhotoSelector
                      key="set"
                      sizes={setSizes}
                      selectedId={selectedSetId}
                      quantity={quantity}
                      onSelectSize={(size) => setSelectedSetId(size.id)}
                      onQuantityChange={setQuantity}
                    />
                  )}
                </AnimatePresence>
              </div>

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
                  Add to Cart
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleBuyNow}
                  disabled={isAdding}
                  className="flex-1 flex items-center justify-center gap-3 py-4 px-6 bg-primary text-primary-foreground font-display font-bold text-lg rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 disabled:opacity-60"
                >
                  <ShoppingCart className="w-5 h-5" />
                  Buy Now
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
          <ShoppingCart className="w-5 h-5" />
          Buy Now — ₹{totalPrice}
        </motion.button>
      </div>
    </>
  );
};

export default PhotoCopies;

