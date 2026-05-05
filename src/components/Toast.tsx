"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Info, AlertCircle } from "lucide-react";

interface ToastItem {
  id: number;
  message: string;
  type: "success" | "info" | "error";
  fading: boolean;
}

const DISPLAY_MS = 2800;
const FADE_MS = 300;

let _emit: ((msg: string, type?: "success" | "info" | "error") => void) | null = null;

export function toast(message: string, type: "success" | "info" | "error" = "success") {
  _emit?.(message, type);
}

export function ToastContainer() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    _emit = (message, type = "success") => {
      const id = Date.now();
      setItems((prev) => [...prev, { id, message, type, fading: false }]);

      // Start fade-out animation
      setTimeout(() => {
        setItems((prev) => prev.map((t) => t.id === id ? { ...t, fading: true } : t));
      }, DISPLAY_MS);

      // Remove from DOM after fade completes
      setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id));
      }, DISPLAY_MS + FADE_MS);
    };
    return () => { _emit = null; };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] flex flex-col items-center gap-2 pointer-events-none">
      {items.map((item) => (
        <div
          key={item.id}
          style={{
            animation: item.fading
              ? `toastOut ${FADE_MS}ms ease-in forwards`
              : "toastIn 0.2s ease-out",
          }}
          className="flex items-center gap-2 bg-gray-900 dark:bg-gray-700 text-white px-5 py-2.5 rounded-xl shadow-xl text-sm font-semibold whitespace-nowrap"
        >
          {item.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
          ) : item.type === "error" ? (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          ) : (
            <Info className="w-4 h-4 text-blue-400 shrink-0" />
          )}
          {item.message}
        </div>
      ))}
    </div>
  );
}
