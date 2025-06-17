"use client";

import { useState } from "react";

export default function Home() {
  const [location, setLocation] = useState("");
  const [radius, setRadius] = useState(1);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[] | null>(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResults(null);

    console.log("📤 Sending request to backend...");
    console.log("📝 Payload:", { location, radius });
    console.log("🌐 Endpoint:", `${process.env.NEXT_PUBLIC_API_URL}/api/search`);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location, radius }),
      });

      console.log("📬 Received response:", res);

      const data = await res.json().catch((err) => {
        console.error("❌ Failed to parse JSON:", err);
        throw new Error("Failed to parse backend response");
      });

      console.log("📦 Parsed response data:", data);

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      if (!Array.isArray(data.results)) {
        throw new Error("Invalid data format from backend");
      }

      setResults(data.results);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("💥 Frontend error:", message);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-8 sm:p-16 flex flex-col items-center justify-center gap-8">
      <h1 className="text-2xl sm:text-4xl font-semibold">aband1d</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-md">
        <input
          type="text"
          placeholder="Enter a location (e.g., New York)"
          value={location}
          onChange={(e) => {
            console.log("📍 Location updated:", e.target.value);
            setLocation(e.target.value);
          }}
          className="border border-gray-300 dark:border-gray-600 rounded px-4 py-2 bg-transparent"
          required
        />

        <input
          type="number"
          placeholder="Radius in km"
          value={radius}
          onChange={(e) => {
            const newVal = parseFloat(e.target.value);
            console.log("📏 Radius updated:", newVal);
            setRadius(newVal);
          }}
          min={0.1}
          step={0.1}
          className="border border-gray-300 dark:border-gray-600 rounded px-4 py-2 bg-transparent"
        />

        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white dark:bg-white dark:text-black rounded px-4 py-2 font-semibold"
        >
          {loading ? "Scanning..." : "Scan"}
        </button>
      </form>

      {error && <p className="text-red-500 mt-4">❌ {error}</p>}

      {results && (
        <div className="mt-8 w-full max-w-2xl">
          <h2 className="text-lg font-semibold mb-2">📍 Interesting Locations:</h2>
          {results.length === 0 ? (
            <p>No interesting spots found.</p>
          ) : (
            <ul className="list-disc list-inside space-y-1 text-sm sm:text-base">
              {results.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </main>
  );
}
