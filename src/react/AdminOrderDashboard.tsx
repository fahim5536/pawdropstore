import React, { useState, useEffect } from "react";
import { subscribeToIncomingOrders, Order } from "./firebase";

export default function AdminOrderDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to incoming manual orders from Firestore in Real Time
    const unsubscribe = subscribeToIncomingOrders((liveOrders) => {
      setOrders(liveOrders);
      setLoading(false);
    });

    // Cleanup subscription on component unmount
    return () => unsubscribe();
  }, []);

  const filteredOrders = orders.filter((o) => {
    if (filter === "all") return true;
    return o.status === filter;
  });

  // Calculate high level stats
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const pendingCount = orders.filter((o) => o.status === "pending").length;

  return (
    <div className="max-w-6xl mx-auto p-6 bg-zinc-950 border border-zinc-800 rounded-lg shadow-xl text-zinc-100 font-sans">
      <div className="mb-6 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>📋</span> Real-time Order Pipeline (Firestore)
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time listener connected to Firestore 'orders' collection.
          </p>
        </div>

        {/* Status Filters */}
        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 p-1 rounded text-xs font-semibold">
          {["all", "pending", "processing", "shipped", "delivered"].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1.5 rounded transition capitalize ${
                filter === status
                  ? "bg-lime-400 text-zinc-950 font-bold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Summary Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Total Store Volume</span>
          <span className="text-2xl font-bold font-mono text-lime-400 mt-2">
            ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Orders Received</span>
          <span className="text-2xl font-bold font-mono text-white mt-2">{totalOrders}</span>
        </div>
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Pending Actions</span>
          <span className="text-2xl font-bold font-mono text-amber-400 mt-2">{pendingCount}</span>
        </div>
      </div>

      {/* Orders List View */}
      {loading ? (
        <div className="p-12 text-center text-xs font-mono text-zinc-500">
          Syncing with Firestore orders stream...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-zinc-800 rounded bg-zinc-900/40 text-zinc-400 text-sm">
          No orders match the current status filter.
        </div>
      ) : (
        <div className="border border-zinc-800 rounded overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300 border-collapse">
              <thead>
                <tr className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 uppercase font-bold tracking-wider text-[10px]">
                  <th className="p-4">Order ID</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Order Details</th>
                  <th className="p-4">Total Amount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Order Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-zinc-900/40 transition">
                    <td className="p-4 font-mono font-bold text-lime-400">{o.id}</td>
                    <td className="p-4">
                      <div className="font-bold text-white">{o.customer?.name || "Anonymous"}</div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">{o.customer?.phone}</div>
                    </td>
                    <td className="p-4">
                      <div className="max-w-xs truncate">
                        {o.items?.map((item, idx) => (
                          <span key={idx}>
                            {item.name} <span className="text-zinc-500">×{item.qty}</span>
                          </span>
                        ))}
                      </div>
                      <div className="text-[10px] text-zinc-500 truncate mt-0.5">{o.customer?.address}</div>
                    </td>
                    <td className="p-4 font-mono font-bold text-white">${Number(o.total || 0).toFixed(2)}</td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          o.status === "pending"
                            ? "bg-amber-950/50 text-amber-400 border border-amber-900/50"
                            : o.status === "processing"
                            ? "bg-blue-950/50 text-blue-400 border border-blue-900/50"
                            : o.status === "shipped"
                            ? "bg-indigo-950/50 text-indigo-400 border border-indigo-900/50"
                            : "bg-lime-950/50 text-lime-400 border border-lime-900/50"
                        }`}
                      >
                        ● {o.status}
                      </span>
                    </td>
                    <td className="p-4 text-zinc-400 font-mono text-[10px]">
                      {o.date ? new Date(o.date).toLocaleString() : "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
