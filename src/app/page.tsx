"use client";

import Link from "next/link";
import { Pie } from "react-chartjs-2";
import { ArcElement, Chart as ChartJS, Legend, Tooltip, TooltipItem } from "chart.js";
import { useEffect, useMemo, useState } from "react";

ChartJS.register(ArcElement, Tooltip, Legend);

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
  currentCost: number;
  profitValue: number | null;
};

function formatUsdt(value: number) {
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function Home() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadAssets() {
      setError(null);
      const res = await fetch("/api/assets", { cache: "no-store" });
      const data = (await res.json()) as { ok: boolean; assets?: Asset[]; error?: string };
      if (!isMounted) return;
      if (!data.ok) {
        setError(data.error ?? "Failed to load assets");
        return;
      }
      setAssets(data.assets ?? []);
    }

    void loadAssets();
    return () => {
      isMounted = false;
    };
  }, []);

  const holdings = useMemo(() => {
    const map = new Map<
      string,
      { name: string; quantity: number; buyQuantity: number; buyCost: number }
    >();
    for (const tx of assets) {
      const entry = map.get(tx.name) ?? {
        name: tx.name,
        quantity: 0,
        buyQuantity: 0,
        buyCost: 0,
      };
      if (tx.type === "buy") {
        entry.quantity += tx.quantity;
        entry.buyQuantity += tx.quantity;
        entry.buyCost += tx.quantity * tx.pricePerCoin;
      } else {
        entry.quantity -= tx.quantity;
      }
      map.set(tx.name, entry);
    }
    return Array.from(map.values())
      .filter((item) => item.quantity > 0)
      .map((item, index) => ({
        id: index + 1,
        name: item.name,
        quantity: item.quantity,
        avgBuyPrice: item.buyQuantity > 0 ? item.buyCost / item.buyQuantity : 0,
      }));
  }, [assets]);

  const holdingsByValueDesc = useMemo(
    () =>
      [...holdings].sort(
        (a, b) =>
          b.quantity * b.avgBuyPrice - a.quantity * a.avgBuyPrice,
      ),
    [holdings],
  );

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

    return Array.from(map.values()).map((entry): GroupedPortfolio => {
      const avgBuyPrice =
        entry.totalBuyQty > 0 ? entry.totalBuyCost / entry.totalBuyQty : null;
      const sellTransactions = assets.filter(
        (item) => item.name === entry.name && item.type === "sell",
      );
      const totalSellQuantity = sellTransactions.reduce(
        (sum, item) => sum + item.quantity,
        0,
      );
      const soldCapital =
        avgBuyPrice !== null && avgBuyPrice > 0
          ? avgBuyPrice * totalSellQuantity
          : 0;
      const currentCost = entry.totalBuyCost - soldCapital;
      const profitValue =
        avgBuyPrice !== null && avgBuyPrice > 0 && totalSellQuantity > 0
          ? sellTransactions.reduce(
              (sum, item) =>
                sum + (item.pricePerCoin - avgBuyPrice) * item.quantity,
              0,
            )
          : null;

      return {
        name: entry.name,
        currentCost,
        profitValue,
      };
    });
  }, [assets]);

  const summary = useMemo(() => {
    const firstCapital = 2000;
    const totalProfitNet = groupedPortfolios.reduce(
      (sum, item) => sum + (item.profitValue ?? 0),
      0,
    );
    const totalProfit = groupedPortfolios.reduce(
      (sum, item) => sum + Math.max(item.profitValue ?? 0, 0),
      0,
    );
    const totalLoss = groupedPortfolios.reduce(
      (sum, item) => sum + Math.min(item.profitValue ?? 0, 0),
      0,
    );
    const holdingUsdt = groupedPortfolios.reduce(
      (sum, item) => sum + Math.max(item.currentCost, 0),
      0,
    );
    const remainUsdt = firstCapital - holdingUsdt;

    return {
      firstCapital,
      remainUsdt,
      totalProfit,
      totalLoss,
      totalProfitNet,
    };
  }, [groupedPortfolios]);

  const chartData = useMemo(() => {
    const usdtBalance = Math.max(summary.remainUsdt, 0);
    const entries = holdingsByValueDesc.map((asset) => ({
      name: asset.name,
      value: asset.quantity * asset.avgBuyPrice,
    }));
    if (usdtBalance > 0) {
      entries.push({
        name: "USDT",
        value: usdtBalance,
      });
    }
    entries.sort((a, b) => b.value - a.value);
    const labels = entries.map((entry) => entry.name);
    const values = entries.map((entry) => entry.value);
    const colors = [
      "#111827",
      "#2563EB",
      "#16A34A",
      "#F97316",
      "#DC2626",
      "#A855F7",
      "#0EA5E9",
      "#D97706",
    ];

    const backgroundColor = values.map((_, index) => colors[index % colors.length]);

    return {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor,
          borderWidth: 0,
        },
      ],
    };
  }, [holdingsByValueDesc, summary.remainUsdt]);

  const chartTotalValue = useMemo(
    () => chartData.datasets[0].data.reduce((sum, value) => sum + value, 0),
    [chartData],
  );

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom" as const,
          labels: {
            color: "#9CA3AF",
            boxWidth: 10,
          },
        },
        tooltip: {
          callbacks: {
            label: (context: TooltipItem<"pie">) => {
              const raw = typeof context.raw === "number" ? context.raw : 0;
              const percent = chartTotalValue > 0 ? (raw / chartTotalValue) * 100 : 0;
              return `${context.label}: ${percent.toFixed(1)}%`;
            },
          },
        },
      },
    }),
    [chartTotalValue],
  );

  const valueColor = (value: number) =>
    value >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";

  return (
    <div className="mx-auto flex w-[95%] max-w-none flex-col gap-8 px-6 py-10 text-gray-900 dark:text-gray-100">
      <nav className="flex flex-wrap items-center gap-4 text-sm font-medium">
        <Link
          href="/"
          className="cursor-pointer rounded-md bg-black px-3 py-2 text-white dark:bg-white dark:text-black"
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

      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Asset holdings distribution based on buy price.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
            Total USDT
          </p>
          <div className="mt-1.5 text-3xl font-bold text-green-600 dark:text-green-400">
            {formatUsdt(summary.firstCapital)}
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
            Remain USDT
          </p>
          <div className="mt-1.5 text-3xl font-bold text-green-600 dark:text-green-400">
            {formatUsdt(summary.remainUsdt)}
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
            Total Profit
          </p>
          <div className={`mt-1.5 text-3xl font-bold ${valueColor(summary.totalProfit)}`}>
            {summary.totalProfit >= 0 ? "+" : ""}
            {formatUsdt(summary.totalProfit)}
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
            Total Loss
          </p>
          <div className={`mt-1.5 text-3xl font-bold ${valueColor(summary.totalLoss)}`}>
            {summary.totalLoss >= 0 ? "+" : ""}
            {formatUsdt(summary.totalLoss)}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Holdings Allocation</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Percent of total value by asset.
            </p>
          </div>
          <div className="text-right text-xs text-gray-500 dark:text-gray-400">
            Total value
            <div className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {chartTotalValue.toFixed(2)}
            </div>
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr] lg:items-center">
          <div className="relative h-64 w-full">
            <Pie data={chartData} options={chartOptions} />
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {chartData.labels.map((label, index) => {
              const value = chartData.datasets[0].data[index];
              const percent = chartTotalValue > 0 ? (value / chartTotalValue) * 100 : 0;
              const color = chartData.datasets[0].backgroundColor[index];
              return (
                <div key={`${label}-${index}`} className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    {label}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {percent.toFixed(1)}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
