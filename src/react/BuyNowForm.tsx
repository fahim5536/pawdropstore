import React, { useState } from "react";
import { submitOrderToFirestore, Order, Product } from "./firebase";

interface BuyNowFormProps {
  product: Product;
  onSuccess?: (orderId: string) => void;
  onCancel?: () => void;
}

export default function BuyNowForm({ product, onSuccess, onCancel }: BuyNowFormProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name || !phone || !address || quantity < 1) {
      setError("Please fill in your name, contact phone, and delivery address.");
      return;
    }

    setSubmitting(true);

    try {
      const orderTotal = Number((product.price * quantity).toFixed(2));
      const orderPayload: Omit<Order, "id"> = {
        date: new Date().toISOString(),
        status: "pending",
        customer: {
          name,
          phone,
          address: `${address}, ${city || ""}`.trim(),
        },
        items: [
          {
            id: product.id || String(Date.now()),
            name: product.name,
            price: product.price,
            qty: quantity,
            img: product.img,
          },
        ],
        total: orderTotal,
      };

      const orderId = await submitOrderToFirestore(orderPayload);
      if (onSuccess) {
        onSuccess(orderId);
      }
    } catch (err: any) {
      setError("Failed to process order: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 bg-zinc-950 border border-zinc-800 rounded-lg max-w-md mx-auto text-zinc-100 font-sans shadow-2xl">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-1.5">
          <span className="text-lime-400">⚡</span> Buy Now Instant Order
        </h3>
        <p className="text-xs text-zinc-400 mt-1">
          Complete the form below to secure your order manually via Firestore.
        </p>
      </div>

      {/* Mini Product Review Card */}
      <div className="flex items-center gap-4 p-3 bg-zinc-900 border border-zinc-800 rounded mb-4">
        <img
          src={product.img || "https://picsum.photos/600/400?random=11"}
          alt={product.name}
          className="w-16 h-16 object-cover rounded border border-zinc-800"
          referrerPolicy="no-referrer"
        />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-white truncate">{product.name}</h4>
          <span className="text-xs font-mono text-lime-400 font-semibold block mt-1">
            ${Number(product.price).toFixed(2)} / each
          </span>
        </div>
      </div>

      {error && (
        <div className="p-3 mb-4 text-xs bg-red-950/40 border border-red-900/50 text-red-400 rounded">
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
            Full Name *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
            className="w-full bg-zinc-900 border border-zinc-800 focus:border-lime-500 rounded px-3 py-2 text-sm text-zinc-100 outline-none transition"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
              Contact Phone *
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              className="w-full bg-zinc-900 border border-zinc-800 focus:border-lime-500 rounded px-3 py-2 text-sm text-zinc-100 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
              Email (Optional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
              className="w-full bg-zinc-900 border border-zinc-800 focus:border-lime-500 rounded px-3 py-2 text-sm text-zinc-100 outline-none transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
            Delivery Address *
          </label>
          <input
            type="text"
            required
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Street address, Apt, Suite..."
            className="w-full bg-zinc-900 border border-zinc-800 focus:border-lime-500 rounded px-3 py-2 text-sm text-zinc-100 outline-none transition"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
              City
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="New York"
              className="w-full bg-zinc-900 border border-zinc-800 focus:border-lime-500 rounded px-3 py-2 text-sm text-zinc-100 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
              Quantity
            </label>
            <input
              type="number"
              min="1"
              required
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full bg-zinc-900 border border-zinc-800 focus:border-lime-500 rounded px-3 py-2 text-sm text-zinc-100 outline-none transition"
            />
          </div>
        </div>

        {/* Pricing Summary */}
        <div className="pt-2 border-t border-zinc-800 mt-4 flex justify-between items-center text-sm">
          <span className="text-zinc-400">Total Order Amount:</span>
          <span className="text-base font-bold font-mono text-lime-400">
            ${(product.price * quantity).toFixed(2)}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2.5 pt-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800 rounded py-2.5 text-xs font-semibold transition"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="flex-[1.5] bg-lime-400 hover:bg-lime-500 text-zinc-950 font-bold rounded py-2.5 text-xs transition shadow-lg shadow-lime-400/10"
          >
            {submitting ? "Processing..." : "Confirm Purchase ⚡"}
          </button>
        </div>
      </form>
    </div>
  );
}
