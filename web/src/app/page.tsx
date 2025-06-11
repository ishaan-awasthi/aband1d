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

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location, radius }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");

      setResults(data.predictions);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-8 sm:p-16 flex flex-col items-center justify-center gap-8">
      <h1 className="text-2xl sm:text-4xl font-semibold">aband1d</h1>
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 w-full max-w-md"
      >
        <input
          type="text"
          placeholder="Enter a location (e.g., New York)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 rounded px-4 py-2 bg-transparent"
          required
        />
        <input
          type="number"
          placeholder="Radius in km"
          value={radius}
          onChange={(e) => setRadius(parseFloat(e.target.value))}
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

      {error && <p className="text-red-500 mt-4">{error}</p>}

      {results && (
        <div className="mt-8 w-full max-w-2xl">
          <h2 className="text-lg font-semibold mb-2">Interesting Locations:</h2>
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
