"use client";
import { useSyncExternalStore } from "react";

export interface UIState {
  mobileTab: "table" | "map";
  desktopTable: boolean;
  desktopMap: boolean;
  showFilters: boolean;
  openOnClick: boolean;
  clusterMarkers: boolean;
  isBudgetEditorOpen: boolean;
  isExportModalOpen: boolean;
}

const OPEN_ON_CLICK_KEY = "erasmus-open-on-click";
const CLUSTER_MAP_KEY = "erasmus-cluster-map";

function getInitialState(): UIState {
  const isClient = typeof window !== "undefined";
  let openOnClick = false;
  let clusterMarkers = true;

  if (isClient) {
    try {
      openOnClick = localStorage.getItem(OPEN_ON_CLICK_KEY) === "true";
      const savedCluster = localStorage.getItem(CLUSTER_MAP_KEY);
      if (savedCluster !== null) clusterMarkers = savedCluster === "true";
    } catch {
      // ignore
    }
  }

  return {
    mobileTab: "table",
    desktopTable: true,
    desktopMap: true,
    showFilters: true,
    openOnClick,
    clusterMarkers,
    isBudgetEditorOpen: false,
    isExportModalOpen: false,
  };
}

let currentState: UIState = getInitialState();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export const uiStore = {
  getState: () => currentState,
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  setMobileTab: (tab: "table" | "map") => {
    currentState = { ...currentState, mobileTab: tab };
    emit();
  },
  setDesktopTable: (v: boolean | ((prev: boolean) => boolean)) => {
    const next = typeof v === "function" ? v(currentState.desktopTable) : v;
    currentState = { ...currentState, desktopTable: next };
    emit();
  },
  setDesktopMap: (v: boolean | ((prev: boolean) => boolean)) => {
    const next = typeof v === "function" ? v(currentState.desktopMap) : v;
    currentState = { ...currentState, desktopMap: next };
    emit();
  },
  setShowFilters: (v: boolean | ((prev: boolean) => boolean)) => {
    const next = typeof v === "function" ? v(currentState.showFilters) : v;
    currentState = { ...currentState, showFilters: next };
    emit();
  },
  setOpenOnClick: (v: boolean | ((prev: boolean) => boolean)) => {
    const next = typeof v === "function" ? v(currentState.openOnClick) : v;
    currentState = { ...currentState, openOnClick: next };
    try {
      localStorage.setItem(OPEN_ON_CLICK_KEY, String(next));
    } catch {
      // ignore
    }
    emit();
  },
  setClusterMarkers: (v: boolean | ((prev: boolean) => boolean)) => {
    const next = typeof v === "function" ? v(currentState.clusterMarkers) : v;
    currentState = { ...currentState, clusterMarkers: next };
    try {
      localStorage.setItem(CLUSTER_MAP_KEY, String(next));
    } catch {
      // ignore
    }
    emit();
  },
  setIsBudgetEditorOpen: (v: boolean) => {
    currentState = { ...currentState, isBudgetEditorOpen: v };
    emit();
  },
  setIsExportModalOpen: (v: boolean) => {
    currentState = { ...currentState, isExportModalOpen: v };
    emit();
  },
};

export function useUIStore(): [UIState, typeof uiStore] {
  const state = useSyncExternalStore(
    uiStore.subscribe,
    uiStore.getState,
    getInitialState,
  );
  return [state, uiStore];
}
