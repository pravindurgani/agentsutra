import { z } from 'astro/zod';

export const schemaVersion = '1.0' as const;

export const schemaVersionSchema = z.literal(schemaVersion);
export const isoDateSchema = z.iso.date();
export const nonEmptyTextSchema = z.string().trim().min(1);
export const sentenceSchema = z.string().trim().min(12).max(600);

export const fieldNoteIdSchema = z.string().regex(/^FN-\d{3}$/);
export const evidencePackIdSchema = z.string().regex(/^EP-FN-\d{3}$/);
export const threadDiagramIdSchema = z.string().regex(/^TD-FN-\d{3}$/);
export const adaptationIdSchema = z.string().regex(/^AD-FN-\d{3}-(IG|TT|LI|RD)$/);
export const interviewIdSchema = z.string().regex(/^IV-FN-\d{3}$/);

export const riskClassSchema = z.enum(['A', 'B', 'C', 'D']);
export const lifecycleSchema = z.enum([
  'draft',
  'review',
  'approved',
  'published',
  'corrected',
  'withdrawn',
]);

export const gatedLifecycleStates = new Set(['approved', 'published', 'corrected']);

export const riskLifecycle = {
  A: 'Explanatory model: editorial review and an explicit boundary.',
  B: 'Implementation or incident: direct evidence and reproducible method before approval.',
  C: 'Measurement: verified evidence plus a versioned measurement record before approval.',
  D: 'Safety, security, infrastructure, or career claim: Class C controls plus independent high-risk review.',
} as const;

const publicUrlSchema = z.url().refine(
  (value) => {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const isIpLiteral = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host) || host.startsWith('[');
    const isLocalHost =
      host === 'localhost' ||
      !host.includes('.') ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      host.endsWith('.lan');
    return (
      url.protocol === 'https:' &&
      url.username === '' &&
      url.password === '' &&
      !isIpLiteral &&
      !isLocalHost
    );
  },
  {
    message:
      'Public evidence URLs must use HTTPS and cannot identify a local host, IP address, or embedded credential.',
  },
);

export const evidenceSourceSchema = z.discriminatedUnion('access', [
  z
    .object({
      access: z.literal('public'),
      url: publicUrlSchema,
      label: nonEmptyTextSchema.max(180),
    })
    .strict(),
  z
    .object({
      access: z.literal('private'),
      privateEvidenceId: z.string().regex(/^PE-[A-Z0-9][A-Z0-9-]{5,80}$/),
      publicDescription: sentenceSchema,
    })
    .strict(),
  z
    .object({
      access: z.literal('synthetic'),
      note: z.string().trim().min(12).max(300),
    })
    .strict(),
]);

export type RiskClass = z.infer<typeof riskClassSchema>;
export type Lifecycle = z.infer<typeof lifecycleSchema>;
