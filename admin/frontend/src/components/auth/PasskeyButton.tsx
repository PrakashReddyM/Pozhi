import { useState } from 'react';
import { motion } from 'framer-motion';
import { Fingerprint, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface PasskeyButtonProps {
  email?: string;
  className?: string;
}

const PasskeyButton = ({ email, className = '' }: PasskeyButtonProps) => {
  const { loginWithPasskey } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePasskeyLogin = async () => {
    setError(null);
    setLoading(true);

    try {
      await loginWithPasskey(email);
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Passkey authentication was cancelled.');
      } else if (err.name === 'AbortError') {
        setError('Authentication timed out.');
      } else {
        setError(err.message || 'Passkey login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={className}>
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        onClick={handlePasskeyLogin}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 py-3 px-6 bg-foreground/5 border border-border text-foreground font-medium rounded-xl hover:bg-foreground/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Fingerprint className="w-5 h-5" />
        )}
        {loading ? 'Verifying...' : 'Sign in with Passkey'}
      </motion.button>

      {error && (
        <p className="mt-2 text-sm text-red-500 text-center">{error}</p>
      )}
    </div>
  );
};

export default PasskeyButton;
