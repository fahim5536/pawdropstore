import React, { useState, useRef } from "react";
import { saveProductToFirestore, uploadProductImageWithProgress, Product } from "./firebase";

export default function AdminProductForm() {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [category, setCategory] = useState("GENERAL");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle local image file upload to Firebase Storage
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(null);
    setUploading(true);
    setUploadProgress(0);

    uploadProductImageWithProgress(
      file,
      (progress) => {
        setUploadProgress(Math.round(progress));
      },
      (downloadURL) => {
        setImageUrl(downloadURL);
        setUploading(false);
        setSuccess("Image successfully uploaded to Firebase Storage!");
      },
      (err) => {
        setError("Firebase Storage upload failed: " + err.message);
        setUploading(false);
      }
    );
  };

  // Handle Form Submission to save manual product in Firestore
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const priceNum = parseFloat(price);
    const stockNum = parseInt(stock);

    if (!title || !desc || isNaN(priceNum) || isNaN(stockNum)) {
      setError("Please fill out all required fields with valid values.");
      return;
    }

    try {
      const finalProduct: Product = {
        name: title,
        desc,
        price: priceNum,
        stock: stockNum,
        category,
        img: imageUrl || "https://picsum.photos/600/400?random=11",
      };

      await saveProductToFirestore(finalProduct);
      setSuccess("Product successfully uploaded and saved to Firestore!");
      
      // Reset State
      setTitle("");
      setDesc("");
      setPrice("");
      setStock("");
      setCategory("GENERAL");
      setImageUrl("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      setError("Failed to save product: " + err.message);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-zinc-950 border border-zinc-800 rounded-lg shadow-xl text-zinc-100 font-sans">
      <div className="mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2 text-white">
          <span className="text-lime-400">🛍️</span> Manual Product Upload (Admin)
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          Upload products directly to the Firestore 'products' collection.
        </p>
      </div>

      {error && (
        <div className="p-3 mb-4 text-xs bg-red-950/40 border border-red-900/50 text-red-400 rounded">
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div className="p-3 mb-4 text-xs bg-lime-950/40 border border-lime-900/50 text-lime-400 rounded">
          ✓ {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
            Product Title *
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Premium Orthopedic Memory Foam Bed"
            className="w-full bg-zinc-900 border border-zinc-800 focus:border-lime-500 rounded px-3 py-2 text-sm text-zinc-100 outline-none transition"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
            Description *
          </label>
          <textarea
            required
            rows={4}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Provide a compelling details layout for the customers..."
            className="w-full bg-zinc-900 border border-zinc-800 focus:border-lime-500 rounded px-3 py-2 text-sm text-zinc-100 outline-none transition resize-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
              Price ($) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="29.99"
              className="w-full bg-zinc-900 border border-zinc-800 focus:border-lime-500 rounded px-3 py-2 text-sm text-zinc-100 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
              Stock Quantity *
            </label>
            <input
              type="number"
              min="0"
              required
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              placeholder="50"
              className="w-full bg-zinc-900 border border-zinc-800 focus:border-lime-500 rounded px-3 py-2 text-sm text-zinc-100 outline-none transition"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
              Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 focus:border-lime-500 rounded px-3 py-2.5 text-sm text-zinc-100 outline-none transition"
            >
              <option value="COMFORT">COMFORT</option>
              <option value="HYDRATION">HYDRATION</option>
              <option value="FEEDING">FEEDING</option>
              <option value="SAFETY">SAFETY</option>
              <option value="GROOMING">GROOMING</option>
              <option value="PLAY">PLAY</option>
              <option value="GENERAL">GENERAL</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
              Product Image *
            </label>
            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded px-3 py-2 text-xs font-semibold text-zinc-200 outline-none transition"
              >
                {uploading ? "Uploading..." : "📷 Choose Image"}
              </button>
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Or paste URL link..."
                className="flex-[1.5] bg-zinc-900 border border-zinc-800 focus:border-lime-500 rounded px-3 py-2 text-xs text-zinc-100 outline-none transition"
              />
            </div>
            
            {/* Real-time Upload Progress Bar */}
            {uploading && (
              <div className="mt-2.5">
                <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
                  <span>Uploading to Firebase Storage...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-900 rounded overflow-hidden">
                  <div
                    style={{ width: `${uploadProgress}%` }}
                    className="h-full bg-lime-400 transition-all duration-300"
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={uploading}
            className="bg-lime-400 hover:bg-lime-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-bold px-6 py-3 rounded text-sm transition shadow-lg shadow-lime-400/10"
          >
            Submit Manual Product to Firestore
          </button>
        </div>
      </form>
    </div>
  );
}
