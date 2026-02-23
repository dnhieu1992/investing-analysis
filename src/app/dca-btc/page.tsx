"use client";

import Link from "next/link";
import { useState } from "react";

function formatUsdt(value: number) {
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatBtc(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 8,
    maximumFractionDigits: 8,
  });
}

function parsePercentList(input: string) {
  return input
    .split(",")
    .map((item) => item.trim().replace("%", ""))
    .filter((item) => item.length > 0)
    .map((item) => Number(item))
    .filter((value) => Number.isFinite(value) && value !== 0)
    .map((value) => Math.abs(value));
}

type LadderLevel = {
  level: number;
  dipPercent: number;
  buyPercent: number;
  triggerPrice: number;
  buyAmount: number;
  estimatedBtc: number;
};

type LadderResult = {
  levels: LadderLevel[];
  totalDipBuyAmount: number;
  totalEstimatedBtc: number;
  averageBuyPrice: number;
  safeStartPrice: number;
};

function buildLadderResult(
  totalCapital: number,
  startPriceInput: string,
  dipReserveInput: string,
  dipReserveBuyInput: string,
): LadderResult {
  const safeTotalCapital = Number.isFinite(totalCapital) ? Math.max(totalCapital, 0) : 0;
  const parsedStartPrice = Number(startPriceInput);
  const safeStartPrice = Number.isFinite(parsedStartPrice) ? Math.max(parsedStartPrice, 1) : 1;

  const dipPercents = parsePercentList(dipReserveInput);
  const buyPercents = parsePercentList(dipReserveBuyInput);

  const levels = dipPercents.map((dipPercent, index) => {
    const buyPercent = buyPercents[index];
    const rawTriggerPrice = safeStartPrice * (1 - dipPercent / 100);
    const triggerPrice = rawTriggerPrice > 0 ? rawTriggerPrice : 0;
    const buyAmount = safeTotalCapital * (buyPercent / 100);
    const estimatedBtc = triggerPrice > 0 ? buyAmount / triggerPrice : 0;

    return {
      level: index + 1,
      dipPercent,
      buyPercent,
      triggerPrice,
      buyAmount,
      estimatedBtc,
    };
  });

  const totalDipBuyAmount = levels.reduce((sum, item) => sum + item.buyAmount, 0);
  const totalEstimatedBtc = levels.reduce((sum, item) => sum + item.estimatedBtc, 0);
  const averageBuyPrice = totalEstimatedBtc > 0 ? totalDipBuyAmount / totalEstimatedBtc : 0;

  return {
    levels,
    totalDipBuyAmount,
    totalEstimatedBtc,
    averageBuyPrice,
    safeStartPrice,
  };
}

export default function DcaBtcPage() {
  const [totalCapital, setTotalCapital] = useState<number>(2000);
  const [dipReserveInput, setDipReserveInput] = useState<string>("7,12,18,25,33,40,48");
  const [dipReserveBuyInput, setDipReserveBuyInput] = useState<string>("10,12.5,15,17.5,20,15,10");
  const [startPriceInput, setStartPriceInput] = useState<string>("90000");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LadderResult | null>(null);

  function handleCalculate() {
    const dipPercents = parsePercentList(dipReserveInput);
    const buyPercents = parsePercentList(dipReserveBuyInput);

    if (dipPercents.length === 0 || buyPercents.length === 0) {
      setError("Dip reserve va Dip reserve buy phai co it nhat 1 gia tri hop le.");
      setResult(null);
      return;
    }

    if (dipPercents.length !== buyPercents.length) {
      setError(
        `So luong phan tu khong khop: Dip reserve co ${dipPercents.length}, Dip reserve buy co ${buyPercents.length}.`,
      );
      setResult(null);
      return;
    }

    setError(null);
    setResult(
      buildLadderResult(totalCapital, startPriceInput, dipReserveInput, dipReserveBuyInput),
    );
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
          href="/dca-btc"
          className="cursor-pointer rounded-md bg-black px-3 py-2 text-white dark:bg-white dark:text-black"
        >
          DCA BTC
        </Link>
        <Link
          href="/stratery"
          className="cursor-pointer rounded-md px-3 py-2 text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white"
        >
          Stratery
        </Link>
      </nav>

      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">DCA BTC</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Dip reserve ladder based on start price and buy percentages by capital.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total capital</p>
          <input
            type="number"
            min={0}
            step="0.01"
            value={totalCapital}
            onChange={(event) => setTotalCapital(Number(event.target.value))}
            className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black dark:border-gray-700 dark:bg-gray-900 dark:focus:border-white"
          />
        </label>
        <label className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Start price</p>
          <input
            type="number"
            min={1}
            step="0.01"
            value={startPriceInput}
            onChange={(event) => setStartPriceInput(event.target.value)}
            className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black dark:border-gray-700 dark:bg-gray-900 dark:focus:border-white"
          />
        </label>
        <label className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Dip reserve (%, comma)</p>
          <input
            type="text"
            value={dipReserveInput}
            onChange={(event) => setDipReserveInput(event.target.value)}
            placeholder="7,12,18,25,33,40,48"
            className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black dark:border-gray-700 dark:bg-gray-900 dark:focus:border-white"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Gia giam theo % so voi start price.</p>
        </label>
        <label className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Dip reserve buy (%, comma)</p>
          <input
            type="text"
            value={dipReserveBuyInput}
            onChange={(event) => setDipReserveBuyInput(event.target.value)}
            placeholder="10,12.5,15,17.5,20,15,10"
            className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black dark:border-gray-700 dark:bg-gray-900 dark:focus:border-white"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">% von mua cho moi muc dip tuong ung.</p>
        </label>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleCalculate}
          className="cursor-pointer rounded-md bg-black px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-black"
        >
          Calculate
        </button>
      </div>

      {error && (
        <section className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </section>
      )}

      {result && (
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <h2 className="text-lg font-semibold">Dip Reserve Ladder</h2>
          <div className="mt-4 grid gap-3 text-sm text-gray-700 dark:text-gray-300">
            <div className="flex items-center justify-between">
              <span>Start price</span>
              <span className="font-semibold">{formatUsdt(result.safeStartPrice)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Average buy price</span>
              <span className="font-semibold">{formatUsdt(result.averageBuyPrice)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Total estimated BTC</span>
              <span className="font-semibold">{formatBtc(result.totalEstimatedBtc)} BTC</span>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3">Level</th>
                  <th className="px-4 py-3">Dip</th>
                  <th className="px-4 py-3">Trigger Price</th>
                  <th className="px-4 py-3">Buy %</th>
                  <th className="px-4 py-3">Buy Amount</th>
                  <th className="px-4 py-3">Est. BTC</th>
                </tr>
              </thead>
              <tbody>
                {result.levels.map((item) => (
                  <tr key={item.level} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="px-4 py-3 font-medium">{item.level}</td>
                    <td className="px-4 py-3">-{item.dipPercent.toFixed(1)}%</td>
                    <td className="px-4 py-3">{formatUsdt(item.triggerPrice)}</td>
                    <td className="px-4 py-3">{item.buyPercent.toFixed(1)}%</td>
                    <td className="px-4 py-3">{formatUsdt(item.buyAmount)}</td>
                    <td className="px-4 py-3">{formatBtc(item.estimatedBtc)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
