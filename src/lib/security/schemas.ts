import { z } from "zod";

// Strict-ish on length to bound abuse. Phone is required because for an
// LLC-acquisition lead the team needs to actually call the seller.
export const contactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email().max(200),
  phone: z.string().trim().min(7).max(40),
  company: z.string().trim().max(200).optional().or(z.literal("")),
  mc: z.string().trim().max(40).optional().or(z.literal("")),
  hasRelay: z.enum(["yes", "no"]).optional(),
  mcAgeDays: z
    .union([z.string().trim().max(10), z.literal("")])
    .optional(),
  insurance: z.enum(["active", "inactive"]).optional(),
  state: z.string().trim().max(60).optional().or(z.literal("")),
  notes: z.string().trim().max(4000).optional().or(z.literal("")),
  locale: z.enum(["en", "es", "ru"]).default("en"),
  // Honeypot: must be empty if present.
  website: z.string().max(0).optional().or(z.literal("")),
});

export type ContactPayload = z.infer<typeof contactSchema>;
