// src/lib/validations.ts
import { z } from "zod";

export const createDeclarationSchema = z.object({
  meetingDate: z.string().datetime().refine(
    (date) => {
      const meeting = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return meeting >= today;
    },
    { message: "La fecha del encuentro debe ser hoy o en el futuro" }
  ),
  meetingPlace: z.string().min(1).max(200),
  meetingType: z.string().min(1).max(100),
  clauses: z.array(
    z.object({
      type: z.enum([
        "VOLUNTARY_MEETING",
        "NO_SUBSTANCES",
        "RESPECT_WITHDRAWAL",
        "NO_RECORDING",
        "PROFESSIONAL_CONTEXT",
        "CUSTOM",
      ]),
      text: z.string().min(1).max(1000),
    })
  ).min(1),
});

export const negotiateSchema = z.object({
  clauses: z.array(
    z.object({
      id: z.string().uuid().optional(),
      type: z.enum([
        "VOLUNTARY_MEETING",
        "NO_SUBSTANCES",
        "RESPECT_WITHDRAWAL",
        "NO_RECORDING",
        "PROFESSIONAL_CONTEXT",
        "CUSTOM",
      ]),
      text: z.string().min(1).max(1000),
    })
  ).min(1),
  meetingDate: z.string().datetime().refine(
    (date) => {
      const meeting = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return meeting >= today;
    },
    { message: "La fecha del encuentro debe ser hoy o en el futuro" }
  ).optional(),
  meetingPlace: z.string().min(1).max(200).optional(),
  meetingType: z.string().min(1).max(100).optional(),
});

export const postMeetingSchema = z.object({
  status: z.enum(["OK", "WITHDREW", "OTHER_WITHDREW", "NOT_HELD"]),
  notes: z.string().max(500).optional(),
});

export const reportSchema = z.object({
  reportedId: z.string().uuid(),
  reason: z.string().min(10).max(500),
});

export const blockSchema = z.object({
  blockedId: z.string().uuid(),
});
