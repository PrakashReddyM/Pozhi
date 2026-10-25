import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, LogOut, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";

const AdminSettings = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [newPin, setNewPin] = useState("");
  const [saved, setSaved] = useState(false);

  const handleUpdatePin = () => {
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      toast.error("PIN must be exactly 4 digits");
      return;
    }
    localStorage.setItem("pozhi_admin_pin", newPin);
    setSaved(true);
    toast.success("PIN updated successfully");
    setNewPin("");
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-5 md:p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Settings</h1>
      <p className="text-sm text-gray-400 mb-8">Manage your store security</p>

      {/* PIN Reset Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-5 mb-4">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
            <Shield className="w-5 h-5 text-gray-500" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Store Security</p>
            <p className="text-xs text-gray-400">Change the admin PIN</p>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            maxLength={4}
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="New 4-digit PIN"
            className="flex-1 h-12 rounded-xl border border-gray-200 px-4 text-center text-lg font-semibold tracking-[0.3em] text-gray-900 placeholder:text-gray-300 placeholder:tracking-normal placeholder:text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
          />
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleUpdatePin}
            disabled={newPin.length !== 4}
            className={`h-12 px-5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all ${newPin.length === 4
              ? "bg-gray-900 text-white hover:bg-gray-800"
              : "bg-gray-100 text-gray-300 cursor-not-allowed"
              }`}
          >
            {saved ? <Check className="w-4 h-4" /> : "Update"}
          </motion.button>
        </div>
      </div>

      {/* Logout */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => logout()}
        className="w-full bg-white rounded-2xl border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-4 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
          <LogOut className="w-5 h-5 text-red-500" strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-sm font-semibold text-red-600">Log Out</p>
          <p className="text-xs text-gray-400">Lock the admin panel</p>
        </div>
      </motion.button>
    </div>
  );
};

export default AdminSettings;
