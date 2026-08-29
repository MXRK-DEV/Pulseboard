import React, { useEffect, useState } from "react";

interface Monitor {
  id: number;
  name: string;
  url: string;
  intervalSeconds: number;
  status: "UP" | "DOWN" | "UNKNOWN";
  lastCheck: string | null;
  last_latency_ms: number | null;
  uptime_percentage: string;
}

export default function App() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchMonitors = async () => {
    try {
      const res = await fetch("/api/monitors");
      if (res.ok) {
        const data = await res.json();
        setMonitors(data);
      }
    } catch (err) {
      console.error("Failed fetching monitors:", err);
    }
  };

  useEffect(() => {
    fetchMonitors();
    const timer = setInterval(fetchMonitors, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleAddMonitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !url) return;
    setLoading(true);

    try {
      const res = await fetch("/api/monitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, url, interval_seconds: 30 }),
      });

      if (res.ok) {
        setName("");
        setUrl("");
        await fetchMonitors();
      }
    } catch (err) {
      console.error("Failed to create monitor:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await fetch(`/api/monitors/${id}`, { method: "DELETE" });
      await fetchMonitors();
    } catch (err) {
      console.error("Failed to delete monitor:", err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <header className="flex items-center justify-between border-b border-slate-800 pb-6 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-emerald-400 tracking-tight">
            PulseBoard
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time HTTP Endpoint & Infrastructure Monitor (Prisma ORM)
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-xs text-slate-400">
          Auto-refreshing every{" "}
          <span className="text-emerald-400 font-bold">5s</span>
        </div>
      </header>

      <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-200 mb-4">
          Register New Endpoint
        </h2>
        <form
          onSubmit={handleAddMonitor}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <input
            type="text"
            placeholder="Service Name (e.g. GitHub API)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            required
          />
          <input
            type="url"
            placeholder="Endpoint URL (https://api.github.com)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors duration-200 disabled:opacity-50"
          >
            {loading ? "Registering..." : "Add Endpoint"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-200 mb-4">
          Active Endpoints ({monitors.length})
        </h2>
        {monitors.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-500">
            No endpoints registered yet. Add one above to start monitoring.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {monitors.map((m) => (
              <div
                key={m.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-slate-100 text-base">
                      {m.name}
                    </h3>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wide ${
                        m.status === "UP"
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                          : m.status === "DOWN"
                            ? "bg-rose-950 text-rose-400 border border-rose-800"
                            : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {m.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono truncate mb-4">
                    {m.url}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/50">
                    <span className="block text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                      Latency
                    </span>
                    <span className="text-sm font-semibold text-slate-200">
                      {m.last_latency_ms !== null
                        ? `${m.last_latency_ms}ms`
                        : "--"}
                    </span>
                  </div>
                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/50">
                    <span className="block text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                      Uptime
                    </span>
                    <span className="text-sm font-semibold text-emerald-400">
                      {m.uptime_percentage}%
                    </span>
                  </div>
                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/50 flex items-center justify-center">
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="text-xs text-rose-400 hover:text-rose-300 font-medium transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
