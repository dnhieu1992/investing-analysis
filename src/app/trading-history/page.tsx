"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type TradeType = "long" | "short";

type TradingHistory = {
  id: number;
  name: string;
  openDate: string;
  closeDate: string | null;
  openPrice: number;
  closePrice: number | null;
  notes: string | null;
  source: string | null;
  orderType: "scaping" | "swing" | null;
  type: TradeType;
  level: number;
  volume: number;
  strateryId: number | null;
  strateryName: string | null;
  referenceImages: string[];
};

type Stratery = {
  id: number;
  name: string;
};

type BulkRow = {
  name: string;
  openPrice: string;
  volume: string;
};

type BulkForm = {
  type: TradeType;
  openDate: string;
  strateryId: string;
  level: string;
  source: string;
  orderType: "scaping" | "swing" | "";
  rows: BulkRow[];
};

type FormState = {
  name: string;
  openDate: string;
  closeDate: string | null;
  openPrice: string;
  closePrice: string;
  notes: string | null;
  source: string;
  orderType: "scaping" | "swing" | "";
  type: TradeType;
  level: string;
  volume: string;
  strateryId: string;
  referenceImagesText: string;
};

function createEmptyForm(): FormState {
  return {
    name: "",
    openDate: new Date().toISOString().slice(0, 10),
    closeDate: null,
    openPrice: "",
    closePrice: "",
    notes: null,
    source: "",
    orderType: "",
    type: "long",
    level: "1",
    volume: "",
    strateryId: "",
    referenceImagesText: "",
  };
}

function toDateInput(value: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

function createEmptyBulkForm(): BulkForm {
  return {
    type: "long",
    openDate: new Date().toISOString().slice(0, 10),
    strateryId: "",
    level: "5",
    source: "",
    orderType: "",
    rows: [{ name: "", openPrice: "", volume: "" }],
  };
}

function parseReferenceImages(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function calcProfitLoss(trade: TradingHistory) {
  if (trade.closePrice === null) return null;
  const priceChangeRatio =
    trade.type === "short"
      ? (trade.openPrice - trade.closePrice) / trade.openPrice
      : (trade.closePrice - trade.openPrice) / trade.openPrice;
  const profit =
    trade.volume * trade.level * priceChangeRatio;
  return Number.isFinite(profit) ? profit : null;
}

export default function TradingHistoryPage() {
  const [trades, setTrades] = useState<TradingHistory[]>([]);
  const [strateries, setStrateries] = useState<Stratery[]>([]);
  const [form, setForm] = useState<FormState>(createEmptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState<BulkForm>(createEmptyBulkForm);
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
  const [closeTrade, setCloseTrade] = useState<TradingHistory | null>(null);
  const [closePriceInput, setClosePriceInput] = useState("");
  const [closeDateInput, setCloseDateInput] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterName, setFilterName] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [filterStratery, setFilterStratery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "opening" | "closed"
  >("all");

  const isEditing = useMemo(() => editingId !== null, [editingId]);

  async function loadTrades() {
    setError(null);
    const res = await fetch("/api/trading-history", { cache: "no-store" });
    const data = (await res.json()) as {
      ok: boolean;
      trades?: TradingHistory[];
      error?: string;
    };
    if (!data.ok) {
      setError(data.error ?? "Failed to load trades");
      return;
    }
    setTrades(data.trades ?? []);
  }

  async function loadStrateries() {
    const res = await fetch("/api/stratery", { cache: "no-store" });
    const data = (await res.json()) as {
      ok: boolean;
      strateries?: Stratery[];
      error?: string;
    };
    if (data.ok) {
      setStrateries(data.strateries ?? []);
    }
  }

  useEffect(() => {
    void loadTrades();
    void loadStrateries();
  }, []);

  const filteredTrades = useMemo(() => {
    const nameFilter = filterName.trim().toLowerCase();
    const sourceFilter = filterSource.trim().toLowerCase();
    const strateryFilter = filterStratery.trim();
    const fromTime = dateFrom ? Date.parse(dateFrom) : null;
    const toTime = dateTo ? Date.parse(dateTo) : null;

    const filtered = trades.filter((trade) => {
      const matchesName = nameFilter
        ? trade.name.toLowerCase().includes(nameFilter)
        : true;
      const matchesSource = sourceFilter
        ? (trade.source ?? "").toLowerCase().includes(sourceFilter)
        : true;
      const matchesStratery = strateryFilter
        ? String(trade.strateryId ?? "") === strateryFilter
        : true;
      const matchesStatus =
        filterStatus === "all"
          ? true
          : filterStatus === "opening"
            ? trade.closePrice === null
            : trade.closePrice !== null;
      const tradeTime = Date.parse(trade.openDate);
      const matchesFrom =
        fromTime === null || Number.isNaN(tradeTime)
          ? true
          : tradeTime >= fromTime;
      const matchesTo =
        toTime === null || Number.isNaN(tradeTime) ? true : tradeTime <= toTime;
      return matchesName && matchesSource && matchesStratery && matchesStatus;
    });

    return filtered.filter((trade) => {
      const tradeTime = Date.parse(trade.openDate);
      if (Number.isNaN(tradeTime)) return true;
      if (fromTime !== null && tradeTime < fromTime) return false;
      if (toTime !== null && tradeTime > toTime) return false;
      return true;
    });
  }, [
    trades,
    filterName,
    filterSource,
    filterStratery,
    dateFrom,
    dateTo,
    filterStatus,
  ]);

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

  function closeCloseDialog() {
    setIsCloseDialogOpen(false);
    setCloseTrade(null);
    setClosePriceInput("");
    setCloseDateInput(new Date().toISOString().slice(0, 10));
    setError(null);
  }

  function openCreate() {
    resetForm();
    setIsDialogOpen(true);
  }

  function openBulkCreate() {
    setBulkForm(createEmptyBulkForm());
    setIsBulkDialogOpen(true);
  }

  function closeBulkDialog() {
    setIsBulkDialogOpen(false);
    setBulkForm(createEmptyBulkForm());
    setError(null);
  }

  function updateBulkField<K extends keyof BulkForm>(
    key: K,
    value: BulkForm[K],
  ) {
    setBulkForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateBulkRow(index: number, key: keyof BulkRow, value: string) {
    setBulkForm((prev) => {
      const rows = prev.rows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [key]: value } : row,
      );
      return { ...prev, rows };
    });
  }

  function addBulkRow() {
    setBulkForm((prev) => ({
      ...prev,
      rows: [...prev.rows, { name: "", openPrice: "", volume: "" }],
    }));
  }

  function removeBulkRow(index: number) {
    setBulkForm((prev) => {
      const rows = prev.rows.filter((_, rowIndex) => rowIndex !== index);
      return { ...prev, rows: rows.length ? rows : prev.rows };
    });
  }

  async function submitBulkForm(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const level = Number(bulkForm.level);
      if (Number.isNaN(level)) {
        setError("Please enter a valid level.");
        return;
      }
      const rowsToSubmit = bulkForm.rows.filter(
        (row) => row.name.trim() || row.openPrice.trim() || row.volume.trim(),
      );
      if (rowsToSubmit.length === 0) {
        setError("Please add at least one row.");
        return;
      }

      const payloads = rowsToSubmit.map((row) => {
        const openPrice = Number(row.openPrice);
        const volume = Number(row.volume);
        if (
          !row.name.trim() ||
          Number.isNaN(openPrice) ||
          Number.isNaN(volume)
        ) {
          throw new Error("Please enter valid rows.");
        }
        return {
          name: row.name.trim(),
          openDate: bulkForm.openDate,
          closeDate: null,
          openPrice,
          closePrice: null,
          notes: null,
          source: bulkForm.source.trim() || null,
          orderType: bulkForm.orderType || null,
          type: bulkForm.type,
          level,
          volume,
          strateryId: bulkForm.strateryId
            ? Number(bulkForm.strateryId)
            : null,
          referenceImages: [],
        };
      });

      await Promise.all(
        payloads.map((payload) =>
          fetch("/api/trading-history", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }).then(async (res) => {
            const data = (await res.json()) as { ok: boolean; error?: string };
            if (!data.ok) {
              throw new Error(data.error ?? "Bulk create failed");
            }
          }),
        ),
      );

      await loadTrades();
      closeBulkDialog();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Bulk create failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const openPrice = Number(form.openPrice);
      const closePrice =
        form.closePrice.trim() === "" ? null : Number(form.closePrice);
      const level = Number(form.level);
      const volume = Number(form.volume);
      if (
        Number.isNaN(openPrice) ||
        Number.isNaN(level) ||
        Number.isNaN(volume) ||
        (form.closePrice.trim() !== "" && Number.isNaN(closePrice))
      ) {
        setError("Please enter valid numbers.");
        return;
      }

      const payload = {
        ...form,
        openPrice,
        closePrice,
        level,
        volume,
        strateryId: form.strateryId ? Number(form.strateryId) : null,
        orderType: form.orderType || null,
        referenceImages: parseReferenceImages(form.referenceImagesText),
      };
      const res = await fetch(
        isEditing ? `/api/trading-history/${editingId}` : "/api/trading-history",
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
      await loadTrades();
      resetForm();
      setIsDialogOpen(false);
    } finally {
      setLoading(false);
    }
  }

  function startEdit(trade: TradingHistory) {
    setEditingId(trade.id);
    setForm({
      name: trade.name,
      openDate: trade.openDate,
      closeDate: trade.closeDate,
      openPrice: String(trade.openPrice),
      closePrice: trade.closePrice === null ? "" : String(trade.closePrice),
      notes: trade.notes,
      source: trade.source ?? "",
      orderType: trade.orderType ?? "",
      type: trade.type,
      level: String(trade.level),
      volume: String(trade.volume),
      strateryId: trade.strateryId === null ? "" : String(trade.strateryId),
      referenceImagesText: trade.referenceImages.join(", "),
    });
    setIsDialogOpen(true);
  }

  function startClose(trade: TradingHistory) {
    setCloseTrade(trade);
    setClosePriceInput(
      trade.closePrice === null ? "" : String(trade.closePrice),
    );
    setCloseDateInput(
      trade.closeDate ? toDateInput(trade.closeDate) : new Date().toISOString().slice(0, 10),
    );
    setIsCloseDialogOpen(true);
  }

  async function submitClose(e: React.FormEvent) {
    e.preventDefault();
    if (!closeTrade) return;
    setLoading(true);
    setError(null);
    try {
      const closePrice = Number(closePriceInput);
      if (Number.isNaN(closePrice)) {
        setError("Please enter a valid close price.");
        return;
      }
      const payload = {
        closePrice,
        closeDate: closeDateInput || null,
      };
      const res = await fetch(`/api/trading-history/${closeTrade.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setError(data.error ?? "Update failed");
        return;
      }
      await loadTrades();
      closeCloseDialog();
    } finally {
      setLoading(false);
    }
  }

  const tempProfit = useMemo(() => {
    if (!closeTrade) return null;
    const closePrice = Number(closePriceInput);
    if (Number.isNaN(closePrice) || closePriceInput.trim() === "") return null;
    const priceChangeRatio =
      closeTrade.type === "short"
        ? (closeTrade.openPrice - closePrice) / closeTrade.openPrice
        : (closePrice - closeTrade.openPrice) / closeTrade.openPrice;
    const profit =
      closeTrade.volume * closeTrade.level * priceChangeRatio;
    return Number.isFinite(profit) ? profit : null;
  }, [closeTrade, closePriceInput]);

  async function removeTrade(id: number) {
    if (!confirm("Delete this trade?")) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/trading-history/${id}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setError(data.error ?? "Delete failed");
        return;
      }
      await loadTrades();
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
          className="cursor-pointer rounded-md px-3 py-2 text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white"
        >
          My Portfolios
        </Link>
        <Link
          href="/trading-history"
          className="cursor-pointer rounded-md bg-black px-3 py-2 text-white dark:bg-white dark:text-black"
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
          <h1 className="text-3xl font-semibold">Trading History</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Log, review, and update your trading history.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={openCreate}
            className="cursor-pointer rounded-md bg-black px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-black"
          >
            Add trade
          </button>
          <button
            type="button"
            onClick={openBulkCreate}
            className="cursor-pointer rounded-md border border-green-200 px-4 py-2 text-sm font-semibold text-green-700 dark:border-green-500/40 dark:text-green-400"
          >
            Bulk Add
          </button>
        </div>
      </header>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <div className="border-b border-gray-200 px-6 py-4 text-sm font-semibold dark:border-gray-800">
          Trades
        </div>
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
            <label className="flex flex-col gap-2 text-sm font-medium text-gray-600 dark:text-gray-300">
              Filter name
              <input
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                placeholder="BTC, ETH..."
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-gray-600 dark:text-gray-300">
              Filter source
              <input
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
                placeholder="Binance, Bybit..."
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-gray-600 dark:text-gray-300">
              Filter stratery
              <select
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
                value={filterStratery}
                onChange={(e) => setFilterStratery(e.target.value)}
              >
                <option value="">All</option>
                {strateries.map((stratery) => (
                  <option key={stratery.id} value={stratery.id}>
                    {stratery.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-gray-600 dark:text-gray-300">
              Status
              <select
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
                value={filterStatus}
                onChange={(e) =>
                  setFilterStatus(
                    e.target.value as "all" | "opening" | "closed",
                  )
                }
              >
                <option value="all">All</option>
                <option value="opening">Opening</option>
                <option value="closed">Closed</option>
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-gray-600 dark:text-gray-300">
              From date
              <input
                type="date"
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-gray-600 dark:text-gray-300">
              To date
              <input
                type="date"
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </label>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-900 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Open</th>
                <th className="px-4 py-3">Close</th>
                <th className="px-4 py-3">Level</th>
                <th className="px-4 py-3">Volume</th>
                <th className="px-4 py-3">Stratery</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Order type</th>
                <th className="px-4 py-3">Profit/Loss</th>
                <th className="px-4 py-3">Refs</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrades.length === 0 ? (
                <tr>
                  <td
                    className="px-4 py-6 text-center text-gray-500 dark:text-gray-400"
                    colSpan={8}
                  >
                    No trades yet.
                  </td>
                </tr>
              ) : (
                filteredTrades.map((trade) => (
                  <tr
                    key={trade.id}
                    className="border-t border-gray-100 dark:border-gray-800"
                  >
                    <td className="px-4 py-3 font-medium">
                      <div>{trade.name}</div>
                      <span
                        className={`mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          trade.type === "long"
                            ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
                            : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
                        }`}
                      >
                        {trade.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                      <div>Price: {trade.openPrice}</div>
                      <div>Date: {toDateInput(trade.openDate)}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                      <div>Price: {trade.closePrice ?? "-"}</div>
                      <div>Date: {toDateInput(trade.closeDate) || "-"}</div>
                    </td>
                    <td className="px-4 py-3">{trade.level}</td>
                    <td className="px-4 py-3">{trade.volume}</td>
                    <td className="px-4 py-3">
                      {trade.strateryName ?? "-"}
                    </td>
                    <td className="px-4 py-3">{trade.source ?? "-"}</td>
                    <td className="px-4 py-3">{trade.orderType ?? "-"}</td>
                    <td className="px-4 py-3">
                      {(() => {
                        const profit = calcProfitLoss(trade);
                        if (profit === null) return "-";
                        const value = profit.toFixed(2);
                        const colorClass =
                          profit >= 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400";
                        return <span className={colorClass}>{value}</span>;
                      })()}
                    </td>
                    <td className="px-4 py-3">{trade.referenceImages.length}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="cursor-pointer rounded-md border border-green-200 px-3 py-1 text-xs text-green-700 dark:border-green-500/40 dark:text-green-400"
                          onClick={() => startClose(trade)}
                        >
                          Close
                        </button>
                        <button
                          className="cursor-pointer rounded-md border border-gray-300 px-3 py-1 text-xs dark:border-gray-700 dark:text-gray-200"
                          onClick={() => startEdit(trade)}
                        >
                          Edit
                        </button>
                        <button
                          className="cursor-pointer rounded-md border border-red-200 px-3 py-1 text-xs text-red-600 dark:border-red-500/40 dark:text-red-400"
                          onClick={() => removeTrade(trade.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 px-4 py-6 dark:bg-black/70">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-950">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">
                  {isEditing ? "Edit trade" : "Add trade"}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {isEditing
                    ? "Update the details for this trade."
                    : "Add a new trade to your history."}
                </p>
              </div>
              <button
                type="button"
                onClick={closeDialog}
                aria-label="Close"
                className="cursor-pointer rounded-md border border-gray-200 p-2 text-sm dark:border-gray-800"
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
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Name
                  <input
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                    value={form.name}
                    onChange={(e) => onChange("name", e.target.value)}
                    required
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Type
                  <select
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                    value={form.type}
                    onChange={(e) =>
                      onChange("type", e.target.value as TradeType)
                    }
                  >
                    <option value="long">Long</option>
                    <option value="short">Short</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Open price
                  <input
                    type="number"
                    step="0.0001"
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                    value={form.openPrice}
                    onChange={(e) =>
                      onChange("openPrice", e.target.value)
                    }
                    required
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Open date
                  <input
                    type="date"
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                    value={toDateInput(form.openDate)}
                    onChange={(e) =>
                      onChange("openDate", e.target.value || "")
                    }
                    required
                  />
                </label>
              </div>

              {isEditing && (
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm font-medium">
                    Close price
                  <input
                    type="number"
                    step="0.0001"
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                    value={form.closePrice}
                    onChange={(e) =>
                      onChange("closePrice", e.target.value)
                    }
                  />
                </label>
                  <label className="flex flex-col gap-2 text-sm font-medium">
                    Close date
                    <input
                      type="date"
                      className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                      value={toDateInput(form.closeDate)}
                      onChange={(e) =>
                        onChange("closeDate", e.target.value || null)
                      }
                    />
                  </label>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Stratery
                  <select
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                    value={form.strateryId}
                    onChange={(e) => onChange("strateryId", e.target.value)}
                  >
                    <option value="">No stratery</option>
                    {strateries.map((stratery) => (
                      <option key={stratery.id} value={stratery.id}>
                        {stratery.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Level
                  <input
                    type="number"
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                    value={form.level}
                    onChange={(e) => onChange("level", e.target.value)}
                    required
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Volume
                  <input
                    type="number"
                    step="0.0001"
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                    value={form.volume}
                    onChange={(e) => onChange("volume", e.target.value)}
                    required
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Order type
                  <select
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                    value={form.orderType}
                    onChange={(e) =>
                      onChange(
                        "orderType",
                        e.target.value as "scaping" | "swing" | "",
                      )
                    }
                  >
                    <option value="">No order type</option>
                    <option value="scaping">Scaping</option>
                    <option value="swing">Swing</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium md:col-span-2">
                  Source
                  <input
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                    value={form.source}
                    onChange={(e) => onChange("source", e.target.value)}
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium md:col-span-2">
                  Reference images (comma separated)
                  <input
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                    value={form.referenceImagesText}
                    onChange={(e) =>
                      onChange("referenceImagesText", e.target.value)
                    }
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium md:col-span-2">
                  Notes
                  <textarea
                    className="min-h-[96px] rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                    value={form.notes ?? ""}
                    onChange={(e) =>
                      onChange("notes", e.target.value || null)
                    }
                  />
                </label>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="cursor-pointer rounded-md bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-black"
                >
                  {isEditing ? "Update trade" : "Add trade"}
                </button>
                <button
                  type="button"
                  className="cursor-pointer rounded-md border border-gray-300 px-4 py-2 text-sm dark:border-gray-700"
                  onClick={closeDialog}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCloseDialogOpen && closeTrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 dark:bg-black/70">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-950">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Close trade</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Update close price and close date.
                </p>
              </div>
              <button
                type="button"
                onClick={closeCloseDialog}
                aria-label="Close"
                className="cursor-pointer rounded-md border border-gray-200 p-2 text-sm dark:border-gray-800"
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

            <form onSubmit={submitClose} className="mt-6 grid gap-6">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Close price
                  <input
                    type="number"
                    step="0.0001"
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                    value={closePriceInput}
                    onChange={(e) => setClosePriceInput(e.target.value)}
                    required
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Close date
                  <input
                    type="date"
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                    value={closeDateInput}
                    onChange={(e) => setCloseDateInput(e.target.value)}
                  />
                </label>
              </div>

              <div className="text-sm text-gray-600 dark:text-gray-300">
                Temp profit:&nbsp;
                {tempProfit === null ? (
                  <span className="text-gray-500 dark:text-gray-400">-</span>
                ) : (
                  <span
                    className={
                      tempProfit >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }
                  >
                    {tempProfit.toFixed(2)}
                  </span>
                )}
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="cursor-pointer rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-green-500"
                >
                  Close trade
                </button>
                <button
                  type="button"
                  className="cursor-pointer rounded-md border border-gray-300 px-4 py-2 text-sm dark:border-gray-700"
                  onClick={closeCloseDialog}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isBulkDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 px-4 py-6 dark:bg-black/70">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-950">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Bulk add trades</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Set common fields and add multiple rows.
                </p>
              </div>
              <button
                type="button"
                onClick={closeBulkDialog}
                aria-label="Close"
                className="cursor-pointer rounded-md border border-gray-200 p-2 text-sm dark:border-gray-800"
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

            <form onSubmit={submitBulkForm} className="mt-6 grid gap-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Type
                  <select
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                    value={bulkForm.type}
                    onChange={(e) =>
                      updateBulkField("type", e.target.value as TradeType)
                    }
                  >
                    <option value="long">Long</option>
                    <option value="short">Short</option>
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Open date
                  <input
                    type="date"
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                    value={toDateInput(bulkForm.openDate)}
                    onChange={(e) =>
                      updateBulkField("openDate", e.target.value)
                    }
                    required
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Stratery
                  <select
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                    value={bulkForm.strateryId}
                    onChange={(e) =>
                      updateBulkField("strateryId", e.target.value)
                    }
                  >
                    <option value="">No stratery</option>
                    {strateries.map((stratery) => (
                      <option key={stratery.id} value={stratery.id}>
                        {stratery.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Order type
                  <select
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                    value={bulkForm.orderType}
                    onChange={(e) =>
                      updateBulkField(
                        "orderType",
                        e.target.value as "scaping" | "swing" | "",
                      )
                    }
                  >
                    <option value="">No order type</option>
                    <option value="scaping">Scaping</option>
                    <option value="swing">Swing</option>
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Level
                  <input
                    type="number"
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                    value={bulkForm.level}
                    onChange={(e) => updateBulkField("level", e.target.value)}
                    required
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium md:col-span-2">
                  Source
                  <input
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                    value={bulkForm.source}
                    onChange={(e) => updateBulkField("source", e.target.value)}
                  />
                </label>
              </div>

              <div className="grid gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Rows</h3>
                  <button
                    type="button"
                    onClick={addBulkRow}
                    className="cursor-pointer rounded-md border border-gray-300 px-3 py-1 text-xs dark:border-gray-700 dark:text-gray-200"
                  >
                    Add row
                  </button>
                </div>
                <div className="grid gap-3">
                  {bulkForm.rows.map((row, index) => (
                    <div
                      key={`row-${index}`}
                      className="grid gap-3 rounded-xl border border-gray-200 p-3 md:grid-cols-[1.4fr_1fr_1fr_auto] dark:border-gray-800"
                    >
                      <label className="flex flex-col gap-2 text-sm font-medium">
                        Name
                        <input
                          className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                          value={row.name}
                          onChange={(e) =>
                            updateBulkRow(index, "name", e.target.value)
                          }
                          required
                        />
                      </label>
                      <label className="flex flex-col gap-2 text-sm font-medium">
                        Open price
                        <input
                          type="number"
                          step="0.0001"
                          className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                          value={row.openPrice}
                          onChange={(e) =>
                            updateBulkRow(index, "openPrice", e.target.value)
                          }
                          required
                        />
                      </label>
                      <label className="flex flex-col gap-2 text-sm font-medium">
                        Volume
                        <input
                          type="number"
                          step="0.0001"
                          className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                          value={row.volume}
                          onChange={(e) =>
                            updateBulkRow(index, "volume", e.target.value)
                          }
                          required
                        />
                      </label>
                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => removeBulkRow(index)}
                          className="cursor-pointer rounded-md border border-red-200 px-3 py-2 text-xs text-red-600 dark:border-red-500/40 dark:text-red-400"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="cursor-pointer rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-green-500"
                >
                  Create trades
                </button>
                <button
                  type="button"
                  className="cursor-pointer rounded-md border border-gray-300 px-4 py-2 text-sm dark:border-gray-700"
                  onClick={closeBulkDialog}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
