import { useState, useEffect, useRef } from 'react';
import { Search, X, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

import passphotImg from '@/assets/services/passphoto.jpg';
import photocopiesImg from '@/assets/services/photocopies.jpg';
import framesImg from '@/assets/services/frames.jpg';
import albumImg from '@/assets/services/album.jpg';
import snapnprintImg from '@/assets/services/snapnprint.jpg';

const allServices = [
  { id: 'passphoto', title: 'Passphotos', tags: ['passport', 'visa', 'stamp', 'id photo', 'identification'], desc: 'Passport, visa, stamp size and more.', img: passphotImg, path: '/studio/passphoto' },
  { id: 'photocopies', title: 'Photo Prints', tags: ['print', 'copies', '4x6', 'photo print', 'reprint'], desc: 'High quality 4x6 prints for your special moments.', img: photocopiesImg, path: '/studio/photocopies' },
  { id: 'frames', title: 'Photo Frames', tags: ['frame', 'wall', 'glass', 'lamination', 'framed'], desc: 'Classic frames for your cherished memories.', img: framesImg, path: '/studio/frames' },
  { id: 'album', title: 'Mini Albums', tags: ['album', 'book', 'photo book', 'mini album'], desc: 'Beautiful albums from your favourite photos.', img: albumImg, path: '/studio/album' },
  { id: 'snapnprint', title: 'Snap & Print', tags: ['snap', 'mobile', 'on-site', 'location', 'event'], desc: 'Click, edit and print instantly at your location.', img: snapnprintImg, path: '/studio/snapnprint' },
];

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const results = query.trim().length === 0
    ? allServices
    : allServices.filter((s) => {
        const q = query.toLowerCase();
        return (
          s.title.toLowerCase().includes(q) ||
          s.desc.toLowerCase().includes(q) ||
          s.tags.some((t) => t.includes(q))
        );
      });

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSelect = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="search-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            key="search-modal"
            initial={{ opacity: 0, y: -20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="fixed top-[10vh] left-1/2 -translate-x-1/2 z-[201] w-full max-w-lg mx-4"
            style={{ width: 'min(calc(100vw - 32px), 520px)' }}
          >
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              {/* Input */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
                <Search size={18} className="text-gray-400 flex-shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search services..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex-1 text-base text-gray-900 placeholder-gray-400 outline-none bg-transparent"
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Clear search"
                  >
                    <X size={15} />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors ml-1"
                  aria-label="Close search"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Results */}
              <div className="py-2 max-h-[60vh] overflow-y-auto">
                {query.trim().length > 0 && results.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-10 text-center px-6">
                    <Search size={28} className="text-gray-200" />
                    <p className="text-gray-500 text-sm">No services found for <strong>"{query}"</strong></p>
                    <p className="text-gray-400 text-xs">Try "passport", "frame", "album" or "prints"</p>
                  </div>
                ) : (
                  <>
                    {query.trim().length === 0 && (
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest px-4 pt-2 pb-1">
                        All Services
                      </p>
                    )}
                    {results.map((svc) => (
                      <button
                        key={svc.id}
                        onClick={() => handleSelect(svc.path)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors group text-left"
                      >
                        <img
                          src={svc.img}
                          alt={svc.title}
                          className="w-11 h-11 rounded-lg object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-900 group-hover:text-blue-600 transition-colors">
                            {svc.title}
                          </p>
                          <p className="text-gray-400 text-xs truncate">{svc.desc}</p>
                        </div>
                        <ArrowRight size={14} className="text-gray-300 group-hover:text-blue-500 flex-shrink-0 transition-colors" />
                      </button>
                    ))}
                  </>
                )}
              </div>

              {/* Footer hint */}
              <div className="px-4 py-2.5 border-t border-gray-50 flex items-center gap-3">
                <span className="text-[11px] text-gray-400">Press</span>
                <kbd className="text-[11px] font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Esc</kbd>
                <span className="text-[11px] text-gray-400">to close</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
