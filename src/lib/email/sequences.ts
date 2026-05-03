// Sequence registry — maps sequence_id + step_number to the right template
// + delay from trigger time. Add new steps here, never in the route
// handler.

import type { SequenceId } from "@/lib/db/email-followups";
import {
  sellerNurtureStep1,
  sellerNurtureStep2,
  sellerNurtureStep3,
  sellerNurtureStep4,
  partialRecoveryStep1,
  type TemplateResult,
} from "./templates";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export type SequenceStep = {
  step: number;
  delayMs: number; // ms from trigger time
  render: (
    context: Record<string, unknown> & {
      name: string;
      email: string;
      unsubscribeUrl?: string;
    },
  ) => TemplateResult;
};

export const SEQUENCES: Record<SequenceId, SequenceStep[]> = {
  seller_nurture: [
    { step: 1, delayMs: 16 * HOUR_MS, render: sellerNurtureStep1 }, // ~next morning
    { step: 2, delayMs: 4 * DAY_MS, render: sellerNurtureStep2 },
    { step: 3, delayMs: 10 * DAY_MS, render: sellerNurtureStep3 },
    { step: 4, delayMs: 21 * DAY_MS, render: sellerNurtureStep4 },
  ],
  partial_recovery: [
    { step: 1, delayMs: 30 * 60 * 1000, render: partialRecoveryStep1 }, // 30 min
  ],
};
