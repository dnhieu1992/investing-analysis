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
  type: TradeType;
  level: number;
  volume: number;
  referenceImages: string[];
};

type GroupedSummary = {
  name: string;
  totalOrder: number;
  totalProfit: number;
  totalLoss: number;
};

function calcPnl(trade: TradingHistory) {
  if (trade.closePrice === null) return 0;
  const priceChangeRatio =
    trade.type === "short"
      ? (trade.openPrice - trade.closePrice) / trade.openPrice
      : (trade.closePrice - trade.openPrice) / trade.openPrice;
  const pnl =
    trade.volume * trade.level * priceChangeRatio;
  return Number.isFinite(pnl) ? pnl : 0;
}

export default function FeatureDashboardPage() {
  const [trades, setTrades] = useState<TradingHistory[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadTrades() {
      setError(null);
      const res = await fetch("/api/trading-history", { cache: "no-store" });
      const data = (await res.json()) as {
        ok: boolean;
        trades?: TradingHistory[];
        error?: string;
      };
      if (!isMounted) return;
      if (!data.ok) {
        setError(data.error ?? "Failed to load trades");
        return;
      }
      setTrades(data.trades ?? []);
    }

    void loadTrades();
    return () => {
      isMounted = false;
    };
  }, []);

  const closedTrades = useMemo(
    () => trades.filter((trade) => trade.closePrice !== null),
    [trades],
  );

  const { totalProfit, totalLoss } = useMemo(() => {
    let profit = 0;
    let loss = 0;
    for (const trade of closedTrades) {
      const pnl = calcPnl(trade);
      if (pnl >= 0) {
        profit += pnl;
      } else {
        loss += Math.abs(pnl);
      }
    }
    return { totalProfit: profit, totalLoss: loss };
  }, [closedTrades]);

  const grouped = useMemo(() => {
    const map = new Map<string, GroupedSummary>();
    for (const trade of closedTrades) {
      const pnl = calcPnl(trade);
      const entry = map.get(trade.name) ?? {
        name: trade.name,
        totalOrder: 0,
        totalProfit: 0,
        totalLoss: 0,
      };
      entry.totalOrder += 1;
      if (pnl >= 0) {
        entry.totalProfit += pnl;
      } else {
        entry.totalLoss += Math.abs(pnl);
      }
      map.set(trade.name, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.totalProfit - a.totalProfit);
  }, [closedTrades]);

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
          className="cursor-pointer rounded-md px-3 py-2 text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white"
        >
          Trading History
        </Link>
        <Link
          href="/feature-dashboard"
          className="cursor-pointer rounded-md bg-black px-3 py-2 text-white dark:bg-white dark:text-black"
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

      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">Feature Dashboard</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Summary of closed trades grouped by symbol.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Total Profit
          </p>
          <div className="mt-2 text-2xl font-semibold text-green-600 dark:text-green-400">
            {totalProfit.toFixed(2)}
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Total Loss
          </p>
          <div className="mt-2 text-2xl font-semibold text-red-600 dark:text-red-400">
            {totalLoss.toFixed(2)}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <div className="border-b border-gray-200 px-6 py-4 text-sm font-semibold dark:border-gray-800">
          Closed trades by symbol
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-900 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Total order</th>
                <th className="px-4 py-3">Total profit</th>
                <th className="px-4 py-3">Total loss</th>
              </tr>
            </thead>
            <tbody>
              {grouped.length === 0 ? (
                <tr>
                  <td
                    className="px-4 py-6 text-center text-gray-500 dark:text-gray-400"
                    colSpan={4}
                  >
                    No closed trades yet.
                  </td>
                </tr>
              ) : (
                grouped.map((item) => (
                  <tr
                    key={item.name}
                    className="border-t border-gray-100 dark:border-gray-800"
                  >
                    <td className="px-4 py-3 font-medium">{item.name}</td>
                    <td className="px-4 py-3">{item.totalOrder}</td>
                    <td className="px-4 py-3 text-green-600 dark:text-green-400">
                      {item.totalProfit.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-red-600 dark:text-red-400">
                      {item.totalLoss.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {error && (
          <div className="px-6 py-4 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
      </section>
    </div>
  );
}
