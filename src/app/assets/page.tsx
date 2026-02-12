"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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

type GroupedPortfolio = {
  name: string;
  currentPrice: number;
  holdingsQuantity: number;
  holdingsValue: number;
  avgBuyPrice: number | null;
  profitValue: number | null;
  profitPercent: number | null;
};

type FormState = {
  name: string;
  quantity: string;
  pricePerCoin: string;
  type: TransactionType;
  date: string;
};

function createEmptyForm(): FormState {
  return {
    name: "",
    quantity: "",
    pricePerCoin: "",
    type: "buy",
    date: new Date().toISOString().slice(0, 10),
  };
}

function formatCurrency(value: number) {
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })}`;
}

function formatUsdt(value: number) {
  return `${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} USDT`;
}

export default function AssetsPage() {
  const router = useRouter();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [form, setForm] = useState<FormState>(createEmptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [popover, setPopover] = useState<{
    name: string;
    top: number;
    left: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = useMemo(() => editingId !== null, [editingId]);

  async function loadAssets() {
    setError(null);
    const res = await fetch("/api/assets", { cache: "no-store" });
    const data = (await res.json()) as { ok: boolean; assets?: Asset[]; error?: string };
    if (!data.ok) {
      setError(data.error ?? "Failed to load portfolios");
      return;
    }
    setAssets(data.assets ?? []);
  }

  useEffect(() => {
    void loadAssets();
  }, []);

  function onChange<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetForm() {
    setForm(createEmptyForm());
    setEditingId(null);
  }

  function closeDialog() {
    setIsDialogOpen(false);
    resetForm();
    setError(null);
  }

  function openCreate() {
    resetForm();
    setIsDialogOpen(true);
  }

  function openCreateWithName(name: string) {
    setEditingId(null);
    setForm({
      ...createEmptyForm(),
      name,
    });
    setIsDialogOpen(true);
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
        name: form.name,
        quantity,
        pricePerCoin,
        type: form.type,
        date: form.date,
        notes: null as string | null,
      };

      const res = await fetch(
        isEditing ? `/api/assets/${editingId}` : "/api/assets",
        {
          method: isEditing ? "PUT" : "POST",
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
      resetForm();
      setIsDialogOpen(false);
    } finally {
      setLoading(false);
    }
  }

  async function removePortfolio(name: string) {
    if (!confirm(`Delete all transactions for ${name}?`)) return;
    setLoading(true);
    setError(null);
    try {
      const ids = assets
        .filter((item) => item.name === name)
        .map((item) => item.id);
      for (const id of ids) {
        const res = await fetch(`/api/assets/${id}`, { method: "DELETE" });
        const data = (await res.json()) as { ok: boolean; error?: string };
        if (!data.ok) {
          setError(data.error ?? "Delete failed");
          return;
        }
      }
      await loadAssets();
      setPopover(null);
    } finally {
      setLoading(false);
    }
  }

  const groupedPortfolios = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        latestTransaction: Asset;
        totalBuyQty: number;
        totalBuyCost: number;
        netQty: number;
      }
    >();

    for (const tx of assets) {
      const existing = map.get(tx.name);
      if (!existing) {
        map.set(tx.name, {
          name: tx.name,
          latestTransaction: tx,
          totalBuyQty: tx.type === "buy" ? tx.quantity : 0,
          totalBuyCost: tx.type === "buy" ? tx.quantity * tx.pricePerCoin : 0,
          netQty: tx.type === "buy" ? tx.quantity : -tx.quantity,
        });
        continue;
      }

      if (tx.type === "buy") {
        existing.totalBuyQty += tx.quantity;
        existing.totalBuyCost += tx.quantity * tx.pricePerCoin;
        existing.netQty += tx.quantity;
      } else {
        existing.netQty -= tx.quantity;
      }
      const existingTime = Date.parse(existing.latestTransaction.date ?? "");
      const txTime = Date.parse(tx.date ?? "");
      if (
        Number.isNaN(existingTime) ||
        (!Number.isNaN(txTime) && txTime > existingTime) ||
        (txTime === existingTime && tx.id > existing.latestTransaction.id)
      ) {
        existing.latestTransaction = tx;
      }
    }

    return Array.from(map.values())
      .map((entry): GroupedPortfolio => {
        const avgBuyPrice =
          entry.totalBuyQty > 0 ? entry.totalBuyCost / entry.totalBuyQty : null;
        const currentPrice = entry.latestTransaction.pricePerCoin;
        const holdingsValue = entry.netQty * currentPrice;
        const sellTransactions = assets.filter(
          (item) => item.name === entry.name && item.type === "sell",
        );
        const totalSellQuantity = sellTransactions.reduce(
          (sum, item) => sum + item.quantity,
          0,
        );
        const profitValue =
          avgBuyPrice !== null && avgBuyPrice > 0 && totalSellQuantity > 0
            ? sellTransactions.reduce(
                (sum, item) =>
                  sum +
                  (item.pricePerCoin - avgBuyPrice) * item.quantity,
                0,
              )
            : null;
        const profitPercent =
          profitValue !== null && avgBuyPrice !== null && avgBuyPrice > 0 && totalSellQuantity > 0
            ? (profitValue / (avgBuyPrice * totalSellQuantity)) * 100
            : null;

        return {
          name: entry.name,
          currentPrice,
          holdingsQuantity: entry.netQty,
          holdingsValue,
          avgBuyPrice,
          profitValue,
          profitPercent,
        };
      })
      .sort((a, b) => b.holdingsValue - a.holdingsValue);
  }, [assets]);

  const portfolioSummary = useMemo(() => {
    const firstCapital = 2000;
    const totalProfit = groupedPortfolios.reduce(
      (sum, item) => sum + (item.profitValue ?? 0),
      0,
    );
    const allTimeProfitPercent =
      firstCapital > 0 ? (totalProfit / firstCapital) * 100 : null;
    const totalUsdt = firstCapital + totalProfit;
    const holdingUsdt = groupedPortfolios.reduce(
      (sum, item) => sum + Math.max(item.holdingsValue, 0),
      0,
    );
    const remainUsdt = totalUsdt - holdingUsdt;
    const totalUsdtPercent =
      firstCapital > 0 ? (totalUsdt / firstCapital) * 100 : null;
    const remainUsdtPercent =
      totalUsdt !== 0 ? (remainUsdt / totalUsdt) * 100 : null;

    return {
      firstCapital,
      totalProfit,
      allTimeProfitPercent,
      totalUsdt,
      remainUsdt,
      totalUsdtPercent,
      remainUsdtPercent,
    };
  }, [groupedPortfolios]);


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
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold">My Portfolios</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Create, update, and track your portfolios.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="cursor-pointer rounded-md bg-black px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-black"
        >
          Add transaction
        </button>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">First Capital</p>
          <div className="mt-1.5 text-3xl font-bold text-green-600 dark:text-green-400">
            {formatUsdt(portfolioSummary.firstCapital)}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total USDT</p>
          <div className="mt-1.5 text-3xl font-bold text-green-600 dark:text-green-400">
            {formatUsdt(portfolioSummary.totalUsdt)}
          </div>
          {portfolioSummary.totalUsdtPercent !== null && (
            <div className="mt-1 text-lg font-semibold text-green-600 dark:text-green-400">
              {portfolioSummary.totalUsdtPercent.toFixed(2)}%
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Remain USDT</p>
          <div className="mt-1.5 text-3xl font-bold text-green-600 dark:text-green-400">
            {formatUsdt(portfolioSummary.remainUsdt)}
          </div>
          {portfolioSummary.remainUsdtPercent !== null && (
            <div className="mt-1 text-lg font-semibold text-green-600 dark:text-green-400">
              {portfolioSummary.remainUsdtPercent.toFixed(2)}%
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">All-time profit</p>
          <div
            className={`mt-1.5 text-3xl font-bold ${
              portfolioSummary.totalProfit >= 0
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {portfolioSummary.totalProfit >= 0 ? "+" : ""}
            {formatCurrency(portfolioSummary.totalProfit)}
          </div>
          {portfolioSummary.allTimeProfitPercent !== null && (
            <div
              className={`mt-1 text-lg font-semibold ${
                portfolioSummary.allTimeProfitPercent >= 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {portfolioSummary.allTimeProfitPercent >= 0 ? "+" : ""}
              {portfolioSummary.allTimeProfitPercent.toFixed(2)}%
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <div className="border-b border-gray-200 px-6 py-4 text-sm font-semibold dark:border-gray-800">
          Portfolios
        </div>
        <div className="overflow-x-auto overflow-y-visible">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-900 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Holdings</th>
                <th className="px-4 py-3">Avg. Buy Price</th>
                <th className="px-4 py-3">Profit/Loss</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {groupedPortfolios.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center text-gray-500 dark:text-gray-400" colSpan={6}>
                    No portfolios yet.
                  </td>
                </tr>
              ) : (
                groupedPortfolios.map((item) => {
                  const avgBuyPrice = item.avgBuyPrice;
                  const profitValue = item.profitValue;
                  const profitClass =
                    profitValue === null
                      ? "text-gray-500 dark:text-gray-400"
                      : profitValue >= 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400";

                  return (
                  <tr key={item.name} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="px-4 py-3 font-medium">{item.name}</td>
                    <td className="px-4 py-3">{formatCurrency(item.currentPrice)}</td>
                    <td className="px-4 py-3">
                      <div>{formatCurrency(item.holdingsValue)}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {item.holdingsQuantity}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {avgBuyPrice === null ? "-" : formatCurrency(avgBuyPrice)}
                    </td>
                    <td className={`px-4 py-3 ${profitClass}`}>
                      {profitValue === null ? (
                        "-"
                      ) : (
                        <div>{profitValue >= 0 ? "+" : ""}{formatCurrency(profitValue)}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="relative flex items-center gap-3 text-gray-500 dark:text-gray-400">
                        <button
                          className="cursor-pointer inline-flex h-9 w-9 items-center justify-center rounded-md hover:text-gray-900 dark:hover:text-gray-100"
                          onClick={() => openCreateWithName(item.name)}
                          aria-label={`Add transaction for ${item.name}`}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            className="h-5 w-5"
                          >
                            <path d="M12 5v14" />
                            <path d="M5 12h14" />
                          </svg>
                        </button>
                        <button
                          className="cursor-pointer inline-flex h-9 w-9 items-center justify-center rounded-md hover:text-gray-900 dark:hover:text-gray-100"
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setPopover((prev) =>
                              prev?.name === item.name
                                ? null
                                : {
                                    name: item.name,
                                    top: rect.bottom + 8,
                                    left: rect.right - 150,
                                  },
                            );
                          }}
                          aria-label={`More actions for ${item.name}`}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="h-5 w-5"
                          >
                            <circle cx="6" cy="12" r="1.8" />
                            <circle cx="12" cy="12" r="1.8" />
                            <circle cx="18" cy="12" r="1.8" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 dark:bg-black/70">
          <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 text-gray-900 shadow-xl dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">
                  {isEditing ? "Edit transaction" : "Add transaction"}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {isEditing
                    ? "Update transaction details."
                    : "Add a new buy or sell transaction."}
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
                    required
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
                  {isEditing ? "Update transaction" : "Add transaction"}
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

      {popover && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setPopover(null)}
          aria-hidden="true"
        >
          <div
            className="fixed z-50 min-w-[150px] rounded-xl border border-gray-200 bg-white p-1.5 text-gray-900 shadow-lg dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            style={{ top: popover.top, left: popover.left }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => {
                router.push(`/assets/${encodeURIComponent(popover.name)}`);
                setPopover(null);
              }}
            >
              View detail
            </button>
            <button
              type="button"
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
              onClick={() => void removePortfolio(popover.name)}
            >
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
