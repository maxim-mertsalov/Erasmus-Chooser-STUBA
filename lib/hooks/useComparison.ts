"use client";
import { useCallback, useState } from "react";

export function useComparison(maxItems = 4) {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const toggle = useCallback(
    (uniKey: string) => {
      setSelectedKeys((prev) => {
        if (prev.includes(uniKey)) {
          return prev.filter((k) => k !== uniKey);
        }
        if (prev.length >= maxItems) {
          return [...prev.slice(1), uniKey];
        }
        return [...prev, uniKey];
      });
    },
    [maxItems],
  );

  const remove = useCallback((uniKey: string) => {
    setSelectedKeys((prev) => prev.filter((k) => k !== uniKey));
  }, []);

  const clear = useCallback(() => {
    setSelectedKeys([]);
    setIsOpen(false);
  }, []);

  const has = useCallback((uniKey: string) => selectedKeys.includes(uniKey), [selectedKeys]);

  return {
    selectedKeys,
    isOpen,
    setIsOpen,
    toggle,
    remove,
    clear,
    has,
    count: selectedKeys.length,
    maxItems,
  };
}
