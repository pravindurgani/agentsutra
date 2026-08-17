import { z } from 'astro/zod';

import {
  fieldNoteIdSchema,
  interviewIdSchema,
  nonEmptyTextSchema,
  schemaVersionSchema,
  sentenceSchema,
} from './shared';

export const interviewSchema = z
  .object({
    schemaVersion: schemaVersionSchema,
    id: interviewIdSchema,
    fieldNoteId: fieldNoteIdSchema,
    centralClaim: sentenceSchema,
    explanations: z
      .object({
        seconds30: nonEmptyTextSchema.max(650),
        seconds90: nonEmptyTextSchema.max(1_600),
        minutes3: nonEmptyTextSchema.max(3_500),
      })
      .strict(),
    interviewQuestions: z.array(sentenceSchema).min(1).max(8),
    counterargument: sentenceSchema,
    example: z
      .object({
        kind: z.enum(['synthetic', 'public-evidence']),
        text: sentenceSchema,
      })
      .strict(),
    wouldDoDifferently: sentenceSchema,
  })
  .strict();

export type Interview = z.infer<typeof interviewSchema>;
