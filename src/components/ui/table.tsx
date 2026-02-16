"use client";

import { useState, useMemo, useCallback } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Card } from "@/components/ui/card";

export type Column<T> = {
  key: keyof T & string;
  header: string;
  sortable?: boolean;
  numeric?: boolean;
  mobileVisible?: boolean;
};

type SortState<T> = {
  key: keyof T & string;
  direction: "asc" | "desc";
} | null;

type TableProps<T extends Record<string, unknown>> = {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  className?: string;
};

function Table<T extends Record<string, unknown>>({
  columns,
  data,
  emptyMessage = "Sin datos",
  onRowClick,
  className,
}: TableProps<T>) {
  const [sort, setSort] = useState<SortState<T>>(null);

  const handleSort = useCallback((col: Column<T>) => {
    if (!col.sortable) return;
    setSort((prev) => {
      if (prev?.key !== col.key) return { key: col.key, direction: "asc" };
      if (prev.direction === "asc") return { key: col.key, direction: "desc" };
      return null;
    });
  }, []);

  const sortedData = useMemo(() => {
    if (!sort) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sort.key];
      const bVal = b[sort.key];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sort.direction === "asc" ? cmp : -cmp;
    });
  }, [data, sort]);

  const mobileColumns = columns.filter((c) => c.mobileVisible !== false);

  if (data.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-sm text-text-secondary">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col)}
                  aria-sort={
                    sort?.key === col.key
                      ? sort.direction === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                  className={cn(
                    "sticky top-0 bg-surface-card px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-text-secondary",
                    col.sortable && "cursor-pointer select-none hover:text-text-primary",
                    col.numeric && "text-right font-mono"
                  )}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && sort?.key === col.key && (
                      sort.direction === "asc"
                        ? <ChevronUp className="size-3.5" />
                        : <ChevronDown className="size-3.5" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, i) => (
              <tr
                key={i}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "border-b border-border last:border-b-0",
                  "transition-colors duration-100",
                  onRowClick && "cursor-pointer hover:bg-surface"
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-3 py-3 text-text-primary",
                      col.numeric && "text-right font-mono"
                    )}
                  >
                    {String(row[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-2 sm:hidden">
        {sortedData.map((row, i) => (
          <Card
            key={i}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={onRowClick ? "cursor-pointer" : undefined}
          >
            <div className="flex flex-col gap-1">
              {mobileColumns.map((col) => (
                <div key={col.key} className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                    {col.header}
                  </span>
                  <span
                    className={cn(
                      "text-sm text-text-primary",
                      col.numeric && "font-mono"
                    )}
                  >
                    {String(row[col.key] ?? "")}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export { Table, type TableProps };
