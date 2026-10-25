import { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { uploadFilesChunked, type ChunkedUploadProgress } from '@/services/api';

export interface AddToCartInput {
  service: string;
  title: string;
  description: string;
  price: number;
  quantity?: number;
  priceField: string;
  priceId?: string;
  details: Record<string, string>;
  files?: File[];
  bookingDate?: string;
  bookingTime?: string;
  onUploadProgress?: (p: ChunkedUploadProgress) => void;
}

/**
 * Shared "add to cart" path for every service page.
 *
 * Images are uploaded here rather than at checkout, because the cart persists to
 * localStorage and File objects don't survive that. Uploading needs a session, so
 * anonymous users are sent to sign in first.
 */
export function useAddToCart() {
  const { addItem, openCart } = useCart();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdding, setIsAdding] = useState(false);

  const addToCart = useCallback(
    async (input: AddToCartInput, options?: { thenCheckout?: boolean }) => {
      if (!input.priceId) {
        toast.error('Please choose an option before continuing.');
        return false;
      }

      // Only bounce to sign-in once auth has actually resolved — `isAuthenticated`
      // is false while the session is still being restored, and redirecting then
      // throws out a logged-in user mid-click.
      if (!authLoading && !isAuthenticated) {
        toast.info('Please sign in to continue with your order.');
        navigate(`/account?redirectTo=${encodeURIComponent(location.pathname)}`);
        return false;
      }

      setIsAdding(true);
      try {
        let uploadIds: string[] = [];
        let uploadUrls: string[] = [];

        const files = (input.files || []).filter(Boolean);
        if (files.length > 0) {
          const uploads = await uploadFilesChunked(files, input.onUploadProgress);
          if (!uploads.length) {
            throw new Error('Upload failed');
          }
          uploadIds = uploads.map((u) => u.id);
          uploadUrls = uploads.map((u) => u.storage_url);
        }

        addItem({
          service: input.service,
          serviceTitle: input.title,
          description: input.description,
          price: input.price,
          quantity: input.quantity || 1,
          imageUrl: uploadUrls[0],
          priceField: input.priceField,
          priceId: input.priceId,
          details: input.details,
          uploadIds,
          uploadUrls,
          bookingDate: input.bookingDate,
          bookingTime: input.bookingTime,
        });

        if (options?.thenCheckout) {
          navigate('/checkout');
        } else {
          toast.success('Added to cart');
          openCart();
        }
        return true;
      } catch (err: any) {
        toast.error(err?.message === 'Upload failed'
          ? 'We could not upload your photo. Please try again.'
          : 'Something went wrong. Please try again.');
        return false;
      } finally {
        setIsAdding(false);
      }
    },
    [addItem, openCart, isAuthenticated, authLoading, navigate, location.pathname]
  );

  return { addToCart, isAdding };
}
