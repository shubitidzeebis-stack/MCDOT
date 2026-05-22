"use client";

import { useEffect } from "react";
import { captureAttribution } from "@/lib/attribution";
import { initTestModeFromUrl } from "@/lib/test-mode";

// Mounted once globally in the root layout. Runs once on first load to
// stash UTM / click-ID / referrer info in sessionStorage so the contact
// form can read it at submit time. Also latches internal test-mode
// (?test=1) for the tab so testers don't fire real conversions.
export function AttributionCapture() {
  useEffect(() => {
    initTestModeFromUrl();
    captureAttribution();
  }, []);
  return null;
}
