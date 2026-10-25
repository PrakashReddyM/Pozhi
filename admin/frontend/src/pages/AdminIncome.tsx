import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, ArrowUpRight, Loader2, Calendar, Wallet, Filter, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchAdminStats, AdminStats } from "@/services/api";
import { useState, useMemo } from "react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYesterday, endOfYesterday, subDays } from "date-fns";

type TimeFilter = 'day' | 'week' | 'month' | 'year' | 'lifetime' | 'custom';

const AdminIncome = () => {
  const [filter, setFilter] = useState<TimeFilter>('day');
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({
    from: format(new Date(), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd')
  });

  const { data: stats, isLoading, error, refetch } = useQuery<AdminStats, Error>({
    queryKey: ["admin-stats", filter === 'custom' ? dateRange : null],
    queryFn: () => filter === 'custom'
      ? fetchAdminStats(dateRange.from, dateRange.to)
      : fetchAdminStats(),
    refetchInterval: filter === 'custom' ? false : 30000,
  });

  const [isPickerOpen, setIsPickerOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center text-[#F8F9FA]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Loading stats...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-8 text-center bg-red-50 rounded-2xl border border-red-100 m-8">
        <p className="text-red-600 font-medium">Failed to load statistics.</p>
        <button
          onClick={() => refetch()}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold"
        >
          Retry
        </button>
      </div>
    );
  }

  const getFilterLabel = () => {
    if (filter === 'custom') {
      return `${format(new Date(dateRange.from), 'MMM d')} - ${format(new Date(dateRange.to), 'MMM d, yyyy')}`;
    }
    return `Total Earnings — ${filter}`;
  };

  const getDisplayValue = () => {
    if (filter === 'custom') return stats.customRange?.total ?? 0;
    switch (filter) {
      case 'day': return stats.today;
      case 'week': return stats.thisWeek;
      case 'month': return stats.thisMonth;
      case 'year': return stats.thisYear;
      case 'lifetime': return stats.lifetime;
      default: return stats.today;
    }
  };

  const diffYesterday = (stats.today ?? 0) - (stats.yesterday ?? 0);

  const handleQuickRange = (range: 'yesterday' | 'this-week' | 'last-7' | 'this-month') => {
    let from = new Date();
    let to = new Date();

    switch (range) {
      case 'yesterday':
        from = startOfYesterday();
        to = endOfYesterday();
        break;
      case 'this-week':
        from = startOfWeek(new Date());
        to = endOfWeek(new Date());
        break;
      case 'last-7':
        from = subDays(new Date(), 7);
        break;
      case 'this-month':
        from = startOfMonth(new Date());
        to = endOfMonth(new Date());
        break;
    }

    setDateRange({
      from: format(from, 'yyyy-MM-dd'),
      to: format(to, 'yyyy-MM-dd')
    });
    setFilter('custom');
  };

  return (
    <div className="p-5 md:p-8 max-w-4xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Income Dashboard</h1>
          <p className="text-sm text-gray-400">Real-time earnings overview</p>
        </div>

        <div className="flex items-center bg-white p-1 rounded-xl border border-gray-100 shadow-sm overflow-x-auto no-scrollbar">
          {(['day', 'week', 'month', 'year', 'lifetime'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${filter === f
                ? "bg-gray-900 text-white shadow-md shadow-gray-900/10"
                : "text-gray-400 hover:text-gray-600"
                }`}
            >
              {f}
            </button>
          ))}
          <div className="w-px h-4 bg-gray-100 mx-1" />
          <button
            onClick={() => setIsPickerOpen(!isPickerOpen)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${filter === 'custom'
              ? "bg-blue-600 text-white shadow-md shadow-blue-600/10"
              : "text-blue-500 hover:bg-blue-50"
              }`}
          >
            <Filter className="w-3 h-3" />
            {filter === 'custom' ? "Custom Range" : "Advance Filter"}
          </button>
        </div>
      </div>

      {/* Custom Range Picker Drawer */}
      <AnimatePresence>
        {isPickerOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Select Custom Range</h3>
                <button onClick={() => setIsPickerOpen(false)} className="text-gray-400 hover:text-gray-900">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">From Date</label>
                  <input
                    type="date"
                    value={dateRange.from}
                    onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-gray-900"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">To Date</label>
                  <input
                    type="date"
                    value={dateRange.to}
                    onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-gray-900"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                <button onClick={() => handleQuickRange('yesterday')} className="px-3 py-1.5 rounded-lg border border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-widest hover:bg-gray-50">Yesterday</button>
                <button onClick={() => handleQuickRange('this-week')} className="px-3 py-1.5 rounded-lg border border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-widest hover:bg-gray-50">This Week</button>
                <button onClick={() => handleQuickRange('last-7')} className="px-3 py-1.5 rounded-lg border border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-widest hover:bg-gray-50">Last 7 Days</button>
                <button onClick={() => handleQuickRange('this-month')} className="px-3 py-1.5 rounded-lg border border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-widest hover:bg-gray-50">This Month</button>
              </div>

              <button
                onClick={() => { setFilter('custom'); setIsPickerOpen(false); }}
                className="w-full bg-gray-900 text-white rounded-xl py-3 text-sm font-bold shadow-lg shadow-gray-900/20 hover:bg-black transition-colors"
              >
                Apply Filter Range
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Display Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        key={filter + dateRange.from + dateRange.to}
        className="bg-gray-900 rounded-[2rem] p-8 md:p-12 mb-8 text-white relative overflow-hidden group"
      >
        <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12 transition-transform group-hover:scale-175">
          <Wallet className="w-32 h-32" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-2 text-gray-400 mb-4">
            <Calendar className="w-4 h-4" />
            <span className="text-sm font-bold uppercase tracking-[0.2em]">{getFilterLabel()}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-medium text-gray-500">₹</span>
            <p className="text-6xl md:text-7xl font-bold leading-none tracking-tighter">
              {(getDisplayValue() ?? 0).toLocaleString()}
            </p>
          </div>

          {filter === 'day' && (
            <div className={`flex items-center gap-1.5 mt-8 px-4 py-2 rounded-full w-fit font-bold text-sm ${diffYesterday >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
              }`}>
              <TrendingUp className={`w-4 h-4 ${diffYesterday < 0 && "rotate-180"}`} />
              {diffYesterday >= 0 ? "+" : "-"}₹{Math.abs(diffYesterday).toLocaleString()} vs yesterday
            </div>
          )}

          {filter === 'custom' && (
            <div className="flex items-center gap-1.5 mt-8 px-4 py-2 rounded-full w-fit font-bold text-sm bg-blue-500/10 text-blue-400">
              Found {stats.customRange?.orderCount ?? 0} records in this period
            </div>
          )}
        </div>
      </motion.div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        {[
          { label: "Day", val: stats.today ?? 0 },
          { label: "Week", val: stats.thisWeek ?? 0 },
          { label: "Month", val: stats.thisMonth ?? 0 },
          { label: "Lifetime", val: stats.lifetime ?? 0 },
        ].map((item, i) => (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            key={item.label}
            className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm"
          >
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{item.label}</p>
            <p className="text-lg font-bold text-gray-900">₹{item.val.toLocaleString()}</p>
          </motion.div>
        ))}
      </div>

      {/* Recent Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-gray-900 uppercase tracking-widest">
              {filter === 'custom' ? "Filtered Records" : "Recent Successful Orders"}
            </p>
            {filter === 'custom' && (
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-[0.1em] mt-1">Showing all records in range</p>
            )}
          </div>
          <ArrowUpRight className="w-4 h-4 text-gray-400" />
        </div>
        <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto custom-scrollbar">
          {(stats.recentOrders ?? []).length > 0 ? (
            (stats.recentOrders ?? []).map((order, i) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i < 10 ? 0.3 + i * 0.03 : 0 }}
                className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{order.service}</p>
                    <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">
                      {order.id} • {format(new Date(order.createdAt), "MMM d, h:mm a")}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-bold text-emerald-600">
                  +₹{(order.amount ?? 0).toLocaleString()}
                </span>
              </motion.div>
            ))
          ) : (
            <div className="p-12 text-center text-gray-400 text-sm italic">
              No orders found for this selection.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ShoppingBag = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
  </svg>
);

export default AdminIncome;
