import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint, Plus, Trash2, Loader2, Shield, Smartphone, Globe } from 'lucide-react';
import { startRegistration } from '@simplewebauthn/browser';
import {
  getPasskeyRegistrationOptions,
  verifyPasskeyRegistration,
  listPasskeys,
  deletePasskey,
  type PasskeyInfo,
} from '@/services/api';

const PasskeyManager = () => {
  const [passkeys, setPasskeys] = useState<PasskeyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showNameInput, setShowNameInput] = useState(false);
  const [passkeyName, setPasskeyName] = useState('');

  useEffect(() => {
    loadPasskeys();
  }, []);

  const loadPasskeys = async () => {
    try {
      setLoading(true);
      const data = await listPasskeys();
      setPasskeys(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load passkeys');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setError(null);
    setSuccess(null);
    setRegistering(true);

    try {
      const name = passkeyName.trim() || 'My Passkey';
      const options = await getPasskeyRegistrationOptions(name);
      const credential = await startRegistration({ optionsJSON: options });
      await verifyPasskeyRegistration(credential);
      setSuccess('Passkey added successfully!');
      setShowNameInput(false);
      setPasskeyName('');
      await loadPasskeys();
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Passkey creation was cancelled.');
      } else if (err.name === 'InvalidStateError') {
        setError('This passkey is already registered.');
      } else {
        setError(err.message || 'Failed to register passkey');
      }
    } finally {
      setRegistering(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this passkey? You will no longer be able to sign in with it.')) return;

    setError(null);
    setDeletingId(id);

    try {
      await deletePasskey(id);
      setPasskeys((prev) => prev.filter((p) => p.id !== id));
      setSuccess('Passkey removed.');
    } catch (err: any) {
      setError(err.message || 'Failed to remove passkey');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Passkeys</h3>
        </div>
        <span className="text-xs text-muted-foreground">
          {passkeys.length} registered
        </span>
      </div>

      <p className="text-sm text-muted-foreground">
        Passkeys let you sign in securely using your fingerprint, face, or device PIN.
      </p>

      {/* Messages */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg text-sm text-red-700 dark:text-red-400"
          >
            {error}
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg text-sm text-green-700 dark:text-green-400"
          >
            {success}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Passkey List */}
      <div className="space-y-2">
        {passkeys.map((pk) => (
          <motion.div
            key={pk.id}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between p-4 bg-card border border-border rounded-xl"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                {pk.backed_up ? (
                  <Globe className="w-5 h-5 text-primary" />
                ) : (
                  <Smartphone className="w-5 h-5 text-primary" />
                )}
              </div>
              <div>
                <p className="font-medium text-sm">{pk.friendly_name}</p>
                <p className="text-xs text-muted-foreground">
                  {pk.backed_up ? 'Synced passkey' : 'Device-bound'} &middot; Last used {formatDate(pk.last_used_at)}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleDelete(pk.id)}
              disabled={deletingId === pk.id}
              className="p-2 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-50"
              title="Remove passkey"
            >
              {deletingId === pk.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          </motion.div>
        ))}
      </div>

      {/* Add Passkey */}
      {showNameInput ? (
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Passkey name (e.g. MacBook Pro)"
            value={passkeyName}
            onChange={(e) => setPasskeyName(e.target.value)}
            className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
          />
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleRegister}
            disabled={registering}
            className="px-4 py-2 bg-primary text-primary-foreground font-medium text-sm rounded-lg disabled:opacity-50"
          >
            {registering ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
          </motion.button>
          <button
            onClick={() => { setShowNameInput(false); setPasskeyName(''); }}
            className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      ) : (
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowNameInput(true)}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed border-border rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add a Passkey
        </motion.button>
      )}
    </div>
  );
};

export default PasskeyManager;
