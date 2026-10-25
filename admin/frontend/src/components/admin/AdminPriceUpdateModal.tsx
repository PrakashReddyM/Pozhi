import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Save, X, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";

interface AdminPriceUpdateModalProps {
    product: {
        id: string;
        name: string;
        image: string;
    };
    currentPrices: {
        label: string;
        value: number;
        key: string; // key to update in DB or local state
    }[];
    onClose: () => void;
    onSave: (newPrices: Record<string, number>) => void;
    isLoading?: boolean;
}

const AdminPriceUpdateModal = ({ product, currentPrices, onClose, onSave, isLoading = false }: AdminPriceUpdateModalProps) => {
    const [prices, setPrices] = useState<Record<string, number>>(
        Object.fromEntries(currentPrices.map(p => [p.key, p.value]))
    );
    const [step, setStep] = useState<"edit" | "confirm">("edit");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isInternalSubmitting, setIsInternalSubmitting] = useState(false);

    const handlePriceChange = (key: string, value: number) => {
        setPrices(prev => ({ ...prev, [key]: value }));
    };

    const handleVerifyAndSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password.trim()) {
            setError("Password is required");
            return;
        }

        setIsInternalSubmitting(true);
        setError(null);

        // TODO: Verify password with backend
        // For now, simulating a check (accepts 'admin123' or any non-empty in prototype if backend not ready)
        // In real implementation, send password to an endpoint like /api/v1/auth/verify-password

        try {
            // Simulate password verification delay
            await new Promise(resolve => setTimeout(resolve, 500));

            // If success
            onSave(prices);
            // Don't close immediately if parent is loading
        } catch (err) {
            setError("Incorrect password");
            setIsInternalSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="relative h-32 bg-gray-100 shrink-0">
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover opacity-80" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                        <h2 className="text-xl font-bold text-white shadow-sm">{product.name} Pricing</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body - Flex container handling vertical space */}
                <div className="flex-1 min-h-0 flex flex-col bg-white">
                    <AnimatePresence mode="wait" initial={false}>
                        {step === "edit" ? (
                            <motion.div
                                key="edit"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="flex flex-col h-full overflow-hidden"
                            >
                                {/* Scrollable Content */}
                                <div className="flex-1 overflow-y-auto p-6 space-y-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                                    {currentPrices.map((item) => (
                                        <div key={item.key} className="flex items-center justify-between gap-4">
                                            <label className="text-sm font-medium text-gray-700 flex-1 leading-tight">{item.label}</label>
                                            <div className="relative w-32 shrink-0">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                                                <input
                                                    type="number"
                                                    value={prices[item.key]}
                                                    onChange={(e) => handlePriceChange(item.key, parseFloat(e.target.value) || 0)}
                                                    className="w-full pl-7 pr-3 py-2 rounded-lg border border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-right font-medium"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Fixed Footer for Button */}
                                <div className="p-4 border-t border-gray-100 bg-gray-50/50 shrink-0">
                                    <button
                                        onClick={() => setStep("confirm")}
                                        className="w-full py-3 bg-gray-900 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors"
                                    >
                                        Update Prices
                                    </button>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="confirm"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex flex-col h-full overflow-hidden"
                            >
                                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                    <div className="text-center space-y-2">
                                        <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-500">
                                            <Lock className="w-6 h-6" />
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900">Confirm Updates</h3>
                                        <p className="text-sm text-gray-500">Review your changes before saving.</p>
                                    </div>

                                    {/* Change Summary */}
                                    <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
                                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Changes to Save</h4>
                                        <div className="space-y-2">
                                            {currentPrices.filter(p => prices[p.key] !== p.value).length === 0 ? (
                                                <p className="text-sm text-gray-400 italic">No changes made.</p>
                                            ) : (
                                                currentPrices
                                                    .filter(p => prices[p.key] !== p.value)
                                                    .map(p => (
                                                        <div key={p.key} className="flex items-center justify-between text-sm">
                                                            <span className="font-medium text-gray-700 truncate max-w-[40%] flex-1" title={p.label}>{p.label}</span>
                                                            <div className="flex items-center gap-2 text-gray-600">
                                                                <span className="line-through decoration-red-400 text-gray-400">₹{p.value}</span>
                                                                <ArrowRight className="w-3 h-3 text-gray-400" />
                                                                <span className="font-bold text-emerald-600">₹{prices[p.key]}</span>
                                                            </div>
                                                        </div>
                                                    ))
                                            )}
                                        </div>
                                    </div>

                                    <form id="verify-form" onSubmit={handleVerifyAndSave} className="space-y-4">
                                        <div className="relative">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="Admin Password"
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all"
                                                autoFocus
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                            >
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>

                                        {error && (
                                            <p className="text-sm text-red-500 text-center animate-shake">{error}</p>
                                        )}
                                    </form>
                                </div>

                                {/* Fixed Footer for Actions */}
                                <div className="p-4 border-t border-gray-100 bg-gray-50/50 shrink-0 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setStep("edit")}
                                        className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                                        disabled={isLoading || isInternalSubmitting}
                                    >
                                        Back
                                    </button>
                                    <button
                                        form="verify-form"
                                        type="submit"
                                        disabled={isLoading || isInternalSubmitting}
                                        className="flex-1 py-3 bg-red-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-red-700 transition-colors disabled:opacity-50"
                                    >
                                        {isLoading || isInternalSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save</>}
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};

export default AdminPriceUpdateModal;
