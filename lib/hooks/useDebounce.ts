"use client";
import { useEffect, useState } from "react";

export function useDebounce<T>(value: T, delayMs = 180): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebounced(value);
    }, delayMs);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delayMs]);

  return debounced;
}
