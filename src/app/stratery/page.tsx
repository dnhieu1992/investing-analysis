"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Stratery = {
  id: number;
  name: string;
  description: string | null;
  imageReferences: string[];
};

type FormState = {
  name: string;
  description: string;
  imageReferencesText: string;
};

function createEmptyForm(): FormState {
  return {
    name: "",
    description: "",
    imageReferencesText: "",
  };
}

function parseImageReferences(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function StrateryPage() {
  const [strateries, setStrateries] = useState<Stratery[]>([]);
  const [form, setForm] = useState<FormState>(createEmptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = useMemo(() => editingId !== null, [editingId]);

  async function loadStrateries() {
    setError(null);
    const res = await fetch("/api/stratery", { cache: "no-store" });
    const data = (await res.json()) as {
      ok: boolean;
      strateries?: Stratery[];
      error?: string;
    };
    if (!data.ok) {
      setError(data.error ?? "Failed to load strateries");
      return;
    }
    setStrateries(data.strateries ?? []);
  }

  useEffect(() => {
    void loadStrateries();
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

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        name: form.name,
        description: form.description.trim() || null,
        imageReferences: parseImageReferences(form.imageReferencesText),
      };
      const res = await fetch(
        isEditing ? `/api/stratery/${editingId}` : "/api/stratery",
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
      await loadStrateries();
      resetForm();
      setIsDialogOpen(false);
    } finally {
      setLoading(false);
    }
  }

  function startEdit(stratery: Stratery) {
    setEditingId(stratery.id);
    setForm({
      name: stratery.name,
      description: stratery.description ?? "",
      imageReferencesText: stratery.imageReferences.join(", "),
    });
    setIsDialogOpen(true);
  }

  async function removeStratery(id: number) {
    if (!confirm("Delete this stratery?")) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/stratery/${id}`, { method: "DELETE" });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setError(data.error ?? "Delete failed");
        return;
      }
      await loadStrateries();
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
          className="cursor-pointer rounded-md bg-black px-3 py-2 text-white dark:bg-white dark:text-black"
        >
          Stratery
        </Link>
      </nav>

      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold">Stratery</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Create, update, and manage your strateries.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="cursor-pointer rounded-md bg-black px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-black"
        >
          Add stratery
        </button>
      </header>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <div className="border-b border-gray-200 px-6 py-4 text-sm font-semibold dark:border-gray-800">
          Strateries
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-900 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Images</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {strateries.length === 0 ? (
                <tr>
                  <td
                    className="px-4 py-6 text-center text-gray-500 dark:text-gray-400"
                    colSpan={4}
                  >
                    No strateries yet.
                  </td>
                </tr>
              ) : (
                strateries.map((stratery) => (
                  <tr
                    key={stratery.id}
                    className="border-t border-gray-100 dark:border-gray-800"
                  >
                    <td className="px-4 py-3 font-medium">{stratery.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {stratery.description || "-"}
                    </td>
                    <td className="px-4 py-3">
                      {stratery.imageReferences.length}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="cursor-pointer rounded-md border border-gray-300 px-3 py-1 text-xs dark:border-gray-700 dark:text-gray-200"
                          onClick={() => startEdit(stratery)}
                        >
                          Edit
                        </button>
                        <button
                          className="cursor-pointer rounded-md border border-red-200 px-3 py-1 text-xs text-red-600 dark:border-red-500/40 dark:text-red-400"
                          onClick={() => removeStratery(stratery.id)}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 dark:bg-black/70">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-950">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">
                  {isEditing ? "Edit stratery" : "Add stratery"}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {isEditing
                    ? "Update the details for this stratery."
                    : "Add a new stratery."}
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
                <label className="flex flex-col gap-2 text-sm font-medium md:col-span-2">
                  Name
                  <input
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                    value={form.name}
                    onChange={(e) => onChange("name", e.target.value)}
                    required
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium md:col-span-2">
                  Description
                  <textarea
                    className="min-h-[96px] rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                    value={form.description}
                    onChange={(e) => onChange("description", e.target.value)}
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium md:col-span-2">
                  Image references (comma separated)
                  <input
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                    value={form.imageReferencesText}
                    onChange={(e) =>
                      onChange("imageReferencesText", e.target.value)
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
                  {isEditing ? "Update stratery" : "Add stratery"}
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
    </div>
  );
}
