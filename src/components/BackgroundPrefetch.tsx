"use client";

import { useEffect } from "react";
import { startBackgroundPrefetch } from "@/lib/prefetch";

/** No pinta nada: al entrar a la home, deja listos en segundo plano el calendario y los favoritos. */
export default function BackgroundPrefetch() {
  useEffect(() => startBackgroundPrefetch(), []);
  return null;
}