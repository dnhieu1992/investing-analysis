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

  const totalValue = useMemo(
    () =>
      holdings.reduce(
        (sum, asset) => sum + asset.quantity * asset.avgBuyPrice,
        0,
      ),
    [holdings],
  );

  const chartData = useMemo(() => {
    const hasHoldings = holdings.length > 0;
    const labels = hasHoldings ? holdings.map((asset) => asset.name) : ["USDT"];
    const values = hasHoldings
      ? holdings.map((asset) => asset.quantity * asset.avgBuyPrice)
      : [1];
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

    const backgroundColor = hasHoldings
      ? values.map((_, index) => colors[index % colors.length])
      : ["#16A34A"];

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
  }, [holdings]);

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
              if (holdings.length === 0) return "USDT: 100%";
              const raw = typeof context.raw === "number" ? context.raw : 0;
              const percent = totalValue > 0 ? (raw / totalValue) * 100 : 0;
              return `${context.label}: ${percent.toFixed(1)}%`;
            },
          },
        },
      },
    }),
    [holdings.length, totalValue],
  );

  const totalProfit = 0;
  const totalLoss = 0;
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

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Total USDT
          </p>
          <div className="mt-2 text-2xl font-semibold text-green-600 dark:text-green-400">
            1000 USDT
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Remain USDT
          </p>
          <div className="mt-2 text-2xl font-semibold text-green-600 dark:text-green-400">
            1000 USDT
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Total Profit
          </p>
          <div className={`mt-2 text-2xl font-semibold ${valueColor(totalProfit)}`}>
            {totalProfit} USDT
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Total Loss
          </p>
          <div className={`mt-2 text-2xl font-semibold ${valueColor(totalLoss)}`}>
            {totalLoss} USDT
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
              {totalValue.toFixed(2)}
            </div>
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr] lg:items-center">
          <div className="relative h-64 w-full">
            <Pie data={chartData} options={chartOptions} />
          </div>
          <div className="grid gap-3">
            {holdings.length === 0 ? (
              <div className="flex items-center flex-start gap-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: chartData.datasets[0].backgroundColor[0] }}
                  />
                  USDT
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">100%</div>
              </div>
            ) : (
              holdings.map((asset, index) => {
                const value = asset.quantity * asset.avgBuyPrice;
                const percent = totalValue > 0 ? (value / totalValue) * 100 : 0;
                const color = chartData.datasets[0].backgroundColor[index];
                return (
                    <div key={asset.id} className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        {asset.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {percent.toFixed(1)}%
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
