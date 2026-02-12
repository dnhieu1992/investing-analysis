export type Stratery = {
  id: number;
  name: string;
  description: string | null;
  imageReferences: string[];
};

function parseImageReferences(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item));
      }
    } catch {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  return [];
}

export function mapStrateryRow(row: Record<string, unknown>): Stratery {
  const record = row as Record<string, any>;
  return {
    id: Number(record.id),
    name: String(record.name),
    description: record.description ?? null,
    imageReferences: parseImageReferences(record.image_references),
  };
}
