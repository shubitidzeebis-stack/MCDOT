"use client";

import { useEffect } from "react";
import { captureAttribution } from "@/lib/attribution";

// Mounted once globally in the root layout. Runs once on first load to
// stash UTM / click-ID / referrer info in sessionStorage so the contact
// form can read it at submit time.
export function AttributionCapture() {
  useEffect(() => {
    captureAttribution();
  }, []);
  return null;
}
