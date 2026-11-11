"use client";
import { useMemo, useState } from "react";

export type PageSizeOption = 25 | 50 | 100 | "all";

export function usePagination<T>(items: T[], initialPageSize: PageSizeOption = 50) {
  const [pageSize, setPageSize] = useState<PageSizeOption>(initialPageSize);
  const [page, setPage] = useState(1);

  const totalItems = items.length;

  const totalPages = useMemo(() => {
    if (pageSize === "all" || totalItems === 0) return 1;
    return Math.ceil(totalItems / pageSize);
  }, [totalItems, pageSize]);

  // Adjust page if totalPages shrinks
  const safePage = Math.min(Math.max(1, page), totalPages);

  const pagedItems = useMemo(() => {
    if (pageSize === "all") return items;
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, pageSize, safePage]);

  const handleSetPageSize = (size: PageSizeOption) => {
    setPageSize(size);
    setPage(1);
  };

  return {
    page: safePage,
    setPage,
    pageSize,
    setPageSize: handleSetPageSize,
    totalPages,
    totalItems,
    pagedItems,
  };
}
