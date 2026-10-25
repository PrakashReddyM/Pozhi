import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Edit2, Loader2, AlertCircle } from "lucide-react";
import AdminPriceUpdateModal from "@/components/admin/AdminPriceUpdateModal";
import { fetchAllPricing, updatePricing } from "@/services/api";

import passphotoImg from "@/assets/services/passphoto.jpg";
import photocopiesImg from "@/assets/services/photocopies.jpg";
import albumImg from "@/assets/services/album.jpg";
import framesImg from "@/assets/services/frames.jpg";
import snapnprintImg from "@/assets/services/snapnprint.jpg";

interface Product {
  id: string; // Service ID (e.g., 'passphoto')
  name: string;
  image: string;
  variants: {
    key: string; // Format: "tableName|uuid"
    label: string;
    value: number;
    originalId: string;
    table: string;
  }[];
}

const AdminPrices = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadPrices();
  }, []);

  const loadPrices = async () => {
    try {
      setLoading(true);
      const data = await fetchAllPricing();

      const mappedProducts: Product[] = [
        {
          id: "passphoto",
          name: "Passport Photo",
          image: passphotoImg,
          variants: data.passphoto.flatMap(cat =>
            cat.packs.map(p => ({
              key: `passphoto_packs|${p.id}`,
              label: `${p.label} (${p.copies} copies) - ${cat.label}`,
              value: p.price,
              originalId: p.id,
              table: 'passphoto_packs'
            }))
          )
        },
        {
          id: "photocopies",
          name: "Photo Copies",
          image: photocopiesImg,
          variants: [
            ...data.photocopies.single.map(s => ({
              key: `photocopies_single|${s.id}`,
              label: `${s.sizeLabel} (${s.copies})`,
              value: s.price,
              originalId: s.id,
              table: 'photocopies_single'
            })),
            ...data.photocopies.set.map(s => ({
              key: `photocopies_set|${s.id}`,
              label: `${s.sizeLabel} Set`,
              value: s.pricePerPiece,
              originalId: s.id,
              table: 'photocopies_set'
            }))
          ]
        },
        {
          id: "frames",
          name: "Photo Frame",
          image: framesImg,
          variants: data.frames.sizes.map(s => ({
            key: `frame_sizes|${s.id}`,
            label: `${s.sizeLabel} (${s.dimensions})`,
            value: s.price,
            originalId: s.id,
            table: 'frame_sizes'
          }))
        },
        {
          id: "album",
          name: "Album",
          image: albumImg,
          variants: data.albums.map(a => ({
            key: `album_capacities|${a.id}`,
            label: `${a.label} (${a.images} images)`,
            value: a.price,
            originalId: a.id,
            table: 'album_capacities'
          }))
        },
        {
          id: "snapnprint",
          name: "Snap & Print",
          image: snapnprintImg,
          variants: data.snapnprint.flatMap(cat =>
            cat.packages.map(p => ({
              key: `snapnprint_packages|${p.id}`,
              label: `${p.label} - ${cat.label}`,
              value: p.price,
              originalId: p.id,
              table: 'snapnprint_packages'
            }))
          )
        }
      ];

      setProducts(mappedProducts);
    } catch (err) {
      console.error("Failed to load prices", err);
      setError("Failed to load pricing data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSavePrices = async (newPrices: Record<string, number>) => {
    if (!editingProduct) return;

    try {
      setUpdating(true);

      // Find changed prices
      const updates = Object.entries(newPrices).filter(([key, newVal]) => {
        const variant = editingProduct.variants.find(v => v.key === key);
        return variant && variant.value !== newVal;
      });

      // Update sequentially to avoid overwhelming server or race conditions
      for (const [key, newVal] of updates) {
        const [table, id] = key.split('|');
        if (table && id) {
          await updatePricing(table, id, newVal);
        }
      }

      // Optimistically update local state or reload
      await loadPrices(); // Reload to be sure
      setEditingProduct(null);

    } catch (err) {
      console.error("Failed to update prices", err);
      alert("Failed to update some prices. Please check the console.");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-red-500">
      <AlertCircle className="w-10 h-10 mb-2" />
      <p>{error}</p>
      <button onClick={loadPrices} className="mt-4 px-4 py-2 bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200">
        Retry
      </button>
    </div>
  );

  return (
    <div className="p-5 md:p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Price Management</h1>
      <p className="text-sm text-gray-400 mb-8">Select a service to update its variant prices</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <motion.div
            key={product.id}
            whileHover={{ y: -4 }}
            className="group bg-white rounded-2xl border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden cursor-pointer hover:shadow-lg transition-all"
            onClick={() => setEditingProduct(product)}
          >
            <div className="h-40 overflow-hidden relative">
              <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                <h3 className="text-lg font-bold text-white">{product.name}</h3>
              </div>
              <div className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Edit2 className="w-4 h-4 text-gray-900" />
              </div>
            </div>

            <div className="p-4 space-y-2">
              {product.variants.length > 0 ? (
                <>
                  {product.variants.slice(0, 3).map(v => (
                    <div key={v.key} className="flex justify-between text-sm">
                      <span className="text-gray-500 truncate pr-2" title={v.label}>{v.label}</span>
                      <span className="font-medium text-gray-900 shrink-0">₹{v.value}</span>
                    </div>
                  ))}
                  {product.variants.length > 3 && (
                    <p className="text-xs text-center text-gray-400 pt-1">
                      + {product.variants.length - 3} more variants
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-400 italic">No variants available</p>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {editingProduct && (
          <AdminPriceUpdateModal
            product={editingProduct}
            currentPrices={editingProduct.variants}
            onClose={() => !updating && setEditingProduct(null)}
            onSave={handleSavePrices}
            isLoading={updating}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminPrices;
