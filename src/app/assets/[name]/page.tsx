"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type TransactionType = "buy" | "sell";

type Asset = {
  id: number;
  name: string;
  quantity: number;
  pricePerCoin: number;
  type: TransactionType;
  date: string | null;
  notes: string | null;
};

type FormState = {
  name: string;
  quantity: string;
  pricePerCoin: string;
  type: TransactionType;
  date: string;
};

function createEmptyForm(name: string): FormState {
  return {
    name,
    quantity: "",
    pricePerCoin: "",
    type: "buy",
    date: new Date().toISOString().slice(0, 10),
  };
}

function toDateInput(value: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

function formatCurrency(value: number) {
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })}`;
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AssetDetailPage() {
  const router = useRouter();
  const params = useParams<{ name: string }>();
  const detailName = decodeURIComponent(params.name);

  const [assets, setAssets] = useState<Asset[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(() => createEmptyForm(detailName));
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(createEmptyForm(detailName));
  }, [detailName]);

  async function loadAssets() {
    setError(null);
    const res = await fetch("/api/assets", { cache: "no-store" });
    const data = (await res.json()) as { ok: boolean; assets?: Asset[]; error?: string };
    if (!data.ok) {
      setError(data.error ?? "Failed to load transactions");
      return;
    }
    setAssets(data.assets ?? []);
  }

  useEffect(() => {
    void loadAssets();
  }, []);

  const detailTransactions = useMemo(
    () =>
      assets
        .filter((tx) => tx.name === detailName)
        .sort((a, b) => {
          const aTime = Date.parse(a.date ?? "");
          const bTime = Date.parse(b.date ?? "");
          if (Number.isNaN(aTime) || Number.isNaN(bTime)) return b.id - a.id;
          return bTime - aTime;
        }),
    [assets, detailName],
  );

  const detailSummary = useMemo(() => {
    const transactions = detailTransactions;
    const buys = transactions.filter((tx) => tx.type === "buy");
    const sells = transactions.filter((tx) => tx.type === "sell");
    const totalBuyQty = buys.reduce((sum, tx) => sum + tx.quantity, 0);
    const totalBuyCost = buys.reduce(
      (sum, tx) => sum + tx.quantity * tx.pricePerCoin,
      0,
    );
    const soldQty = sells.reduce((sum, tx) => sum + tx.quantity, 0);
    const avgBuyPrice = totalBuyQty > 0 ? totalBuyCost / totalBuyQty : null;
    const netQuantity = transactions.reduce(
      (sum, tx) => sum + (tx.type === "buy" ? tx.quantity : -tx.quantity),
      0,
    );
    const currentPrice = detailTransactions[0]?.pricePerCoin ?? 0;
    const totalValue = netQuantity * currentPrice;
    const totalProfit =
      avgBuyPrice !== null && avgBuyPrice > 0
        ? sells.reduce(
            (sum, tx) => sum + (tx.pricePerCoin - avgBuyPrice) * tx.quantity,
            0,
          )
        : 0;
    const totalProfitPercent =
      avgBuyPrice !== null && avgBuyPrice > 0 && soldQty > 0
        ? (totalProfit / (avgBuyPrice * soldQty)) * 100
        : null;
    return {
      symbol: detailName.toUpperCase(),
      totalValue,
      netQuantity,
      avgBuyPrice,
      totalProfit,
      totalProfitPercent,
    };
  }, [detailName, detailTransactions]);

  function openCreate() {
    setEditingId(null);
    setForm(createEmptyForm(detailName));
    setIsDialogOpen(true);
  }

  function openEdit(tx: Asset) {
    setEditingId(tx.id);
    setForm({
      name: tx.name,
      quantity: String(tx.quantity),
      pricePerCoin: String(tx.pricePerCoin),
      type: tx.type,
      date: toDateInput(tx.date),
    });
    setIsDialogOpen(true);
  }

  function closeDialog() {
    setIsDialogOpen(false);
    setEditingId(null);
    setForm(createEmptyForm(detailName));
  }

  function onChange<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const quantity = Number(form.quantity);
      const pricePerCoin = Number(form.pricePerCoin);
      if (Number.isNaN(quantity) || Number.isNaN(pricePerCoin)) {
        setError("Please enter valid numbers.");
        return;
      }
      const payload = {
        name: detailName,
        quantity,
        pricePerCoin,
        type: form.type,
        date: form.date,
        notes: null as string | null,
      };
      const res = await fetch(
        editingId === null ? "/api/assets" : `/api/assets/${editingId}`,
        {
          method: editingId === null ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setError(data.error ?? "Request failed");
        return;
      }
      await loadAssets();
      closeDialog();
    } finally {
      setLoading(false);
    }
  }

  async function removeTransaction(id: number) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/assets/${id}`, { method: "DELETE" });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setError(data.error ?? "Delete failed");
        return;
      }
      await loadAssets();
      setPendingDeleteId(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-[95%] max-w-none flex-col gap-8 px-6 py-10 text-gray-900 dark:text-gray-100">
      <nav className="flex flex-wrap items-center gap-4 text-sm font-medium">
        <Link
          href="/"
          className="cursor-pointer rounded-md px-3 py-2 text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white"
        >
          Dash board
        </Link>
        <Link
          href="/assets"
          className="cursor-pointer rounded-md bg-black px-3 py-2 text-white dark:bg-white dark:text-black"
        >
          My Portfolios
        </Link>
        <Link
          href="/trading-history"
          className="cursor-pointer rounded-md px-3 py-2 text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white"
        >
          Trading History
        </Link>
        <Link
          href="/feature-dashboard"
          className="cursor-pointer rounded-md px-3 py-2 text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white"
        >
          Feature Dashboard
        </Link>
        <Link
          href="/stratery"
          className="cursor-pointer rounded-md px-3 py-2 text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white"
        >
          Stratery
        </Link>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex w-fit items-center gap-2 rounded-md px-1 text-sm font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Back
          </button>
          <h1 className="text-3xl font-semibold">
            {detailName} ({detailSummary.symbol})
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Portfolio transaction details.
          </p>
          <div className="text-4xl font-bold">{formatCurrency(detailSummary.totalValue)}</div>
        </div>
        <button
          type="button"
          className="cursor-pointer rounded-md bg-black px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-black"
          onClick={openCreate}
        >
          Add transaction
        </button>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Quantity
          </p>
          <div className="mt-2 text-2xl font-semibold">
            {detailSummary.netQuantity.toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 6,
            })}{" "}
            {detailSummary.symbol}
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Avg. Buy Price
          </p>
          <div className="mt-2 text-2xl font-semibold">
            {detailSummary.avgBuyPrice ? formatCurrency(detailSummary.avgBuyPrice) : "-"}
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Total Profit / Loss
          </p>
          <div
            className={`mt-2 text-2xl font-semibold ${
              detailSummary.totalProfit >= 0
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {detailSummary.totalProfit >= 0 ? "+" : ""}
            {formatCurrency(detailSummary.totalProfit)}
          </div>
          {detailSummary.totalProfitPercent !== null && (
            <div
              className={`mt-1 text-sm font-semibold ${
                detailSummary.totalProfitPercent >= 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {detailSummary.totalProfitPercent >= 0 ? "+" : ""}
              {detailSummary.totalProfitPercent.toFixed(2)}%
            </div>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <div className="border-b border-gray-200 px-6 py-4 text-sm font-semibold dark:border-gray-800">
          Transactions
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-900 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {detailTransactions.map((tx) => {
                const signedAmount = tx.type === "sell" ? -tx.quantity : tx.quantity;
                const usdAmount = signedAmount * tx.pricePerCoin;
                return (
                  <tr key={tx.id} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                            tx.type === "buy"
                              ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
                              : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
                          }`}
                        >
                          {tx.type === "buy" ? "B" : "S"}
                        </span>
                        <div>
                          <div className="font-semibold capitalize">{tx.type}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDateTime(tx.date)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">{formatCurrency(tx.pricePerCoin)}</td>
                    <td className="px-4 py-4 text-right">
                      <div>
                        {usdAmount >= 0 ? "+" : "-"}
                        {formatCurrency(Math.abs(usdAmount))}
                      </div>
                      <div
                        className={`text-xs ${
                          signedAmount >= 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {signedAmount >= 0 ? "+" : ""}
                        {signedAmount.toLocaleString(undefined, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 6,
                        })}{" "}
                        {detailSummary.symbol}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-3 text-gray-500 dark:text-gray-300">
                        <button
                          type="button"
                          className="rounded-md p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
                          onClick={() => openEdit(tx)}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-5 w-5"
                          >
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="rounded-md p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
                          onClick={() => setPendingDeleteId(tx.id)}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-5 w-5"
                          >
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14H6L5 6" />
                            <path d="M10 11v6M14 11v6" />
                            <path d="M9 6V4h6v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {error && (
          <div className="px-6 py-4 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
      </section>

      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 dark:bg-black/70">
          <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 text-gray-900 shadow-xl dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">
                  {editingId === null ? "Add transaction" : "Edit transaction"}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {editingId === null
                    ? "Add a new buy or sell transaction."
                    : "Update transaction details."}
                </p>
              </div>
              <button
                type="button"
                onClick={closeDialog}
                aria-label="Close"
                className="cursor-pointer rounded-md border border-gray-300 p-2 text-sm hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={submitForm} className="mt-6 grid gap-6">
              <div className="grid gap-4">
                <span className="text-sm font-medium">Type</span>
                <div className="flex rounded-2xl bg-gray-100 p-1 dark:bg-gray-800">
                  <button
                    type="button"
                    onClick={() => onChange("type", "buy")}
                    className={`w-1/2 rounded-xl px-4 py-2 text-center text-base font-semibold transition ${
                      form.type === "buy"
                        ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                        : "text-gray-500 dark:text-gray-300"
                    }`}
                  >
                    Buy
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange("type", "sell")}
                    className={`w-1/2 rounded-xl px-4 py-2 text-center text-base font-semibold transition ${
                      form.type === "sell"
                        ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                        : "text-gray-500 dark:text-gray-300"
                    }`}
                  >
                    Sell
                  </button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Name
                  <input
                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                    value={form.name}
                    onChange={(e) => onChange("name", e.target.value)}
                    readOnly
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Quantity
                  <input
                    type="number"
                    step="0.0001"
                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                    value={form.quantity}
                    onChange={(e) => onChange("quantity", e.target.value)}
                    required
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Price Per Coin
                  <input
                    type="number"
                    step="0.0001"
                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                    value={form.pricePerCoin}
                    onChange={(e) => onChange("pricePerCoin", e.target.value)}
                    required
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Date
                  <input
                    type="date"
                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                    value={form.date}
                    onChange={(e) => onChange("date", e.target.value)}
                    required
                  />
                </label>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="cursor-pointer rounded-md bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900"
                >
                  {editingId === null ? "Add transaction" : "Update transaction"}
                </button>
                <button
                  type="button"
                  className="cursor-pointer rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800"
                  onClick={closeDialog}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {pendingDeleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 dark:bg-black/70">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-gray-900 shadow-xl dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
            <h2 className="text-lg font-semibold">Delete transaction?</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="cursor-pointer rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800"
                onClick={() => setPendingDeleteId(null)}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="cursor-pointer rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60"
                onClick={() => void removeTransaction(pendingDeleteId)}
                disabled={loading}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
