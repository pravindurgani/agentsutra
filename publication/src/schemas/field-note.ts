import { z } from 'astro/zod';

import {
  adaptationIdSchema,
  evidencePackIdSchema,
  fieldNoteIdSchema,
  interviewIdSchema,
  isoDateSchema,
  gatedLifecycleStates,
  lifecycleSchema,
  nonEmptyTextSchema,
  riskClassSchema,
  schemaVersionSchema,
  sentenceSchema,
  threadDiagramIdSchema,
} from './shared';

export const shareImageSchema = z
  .object({
    src: z
      .string()
      .regex(
        /^\/social\/(?:agentsutra-default|field-notes\/[a-z0-9]+(?:-[a-z0-9]+)*)\.png$/,
        'Share images must use the approved default image or a slug-specific Field Note path.',
      ),
    alt: nonEmptyTextSchema.min(30).max(240),
    width: z.literal(1200),
    height: z.literal(630),
  })
  .strict();

export const fieldNoteSchema = z
  .object({
    schemaVersion: schemaVersionSchema,
    id: fieldNoteIdSchema,
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    lifecycle: lifecycleSchema,
    fixture: z.boolean().default(false),
    title: nonEmptyTextSchema.max(180),
    description: nonEmptyTextSchema.min(40).max(320),
    shareImage: shareImageSchema.optional(),
    centralClaim: sentenceSchema,
    answer: sentenceSchema,
    arc: nonEmptyTextSchema.max(80),
    secondaryArcs: z.array(nonEmptyTextSchema.max(80)).max(4).default([]),
    difficulty: z.enum(['foundation', 'builder', 'advanced']),
    audiences: z.array(z.enum(['curious-user', 'builder-operator', 'technical-evaluator'])).min(1),
    riskClass: riskClassSchema,
    evidencePackId: evidencePackIdSchema,
    diagramId: threadDiagramIdSchema,
    adaptationIds: z.array(adaptationIdSchema).min(1).max(4),
    interviewId: interviewIdSchema,
    beats: z
      .object({
        problem: sentenceSchema,
        naiveModel: sentenceSchema,
        mechanism: sentenceSchema,
        evidenceSummary: sentenceSchema,
        boundary: sentenceSchema,
        transfer: sentenceSchema,
        memoryLine: nonEmptyTextSchema.min(8).max(160),
        depthDoor: sentenceSchema,
      })
      .strict(),
    dates: z
      .object({
        created: isoDateSchema,
        updated: isoDateSchema,
        published: isoDateSchema.optional(),
        reviewed: isoDateSchema.optional(),
      })
      .strict(),
    relations: z
      .object({
        prerequisites: z.array(fieldNoteIdSchema).max(5).default([]),
        related: z.array(fieldNoteIdSchema).max(8).default([]),
        next: fieldNoteIdSchema.optional(),
      })
      .strict(),
    aiDisclosure: sentenceSchema,
  })
  .strict()
  .superRefine((note, context) => {
    if (note.id === 'FN-000' && (!note.fixture || note.lifecycle !== 'draft')) {
      context.addIssue({
        code: 'custom',
        path: ['fixture'],
        message: 'FN-000 is reserved for a draft synthetic fixture.',
      });
    }
    if (note.fixture && note.id !== 'FN-000') {
      context.addIssue({
        code: 'custom',
        path: ['fixture'],
        message: 'FN-000 is the only permitted synthetic fixture ID.',
      });
    }
    if (
      (note.lifecycle === 'published' || note.lifecycle === 'corrected') &&
      !note.dates.published
    ) {
      context.addIssue({
        code: 'custom',
        path: ['dates', 'published'],
        message: 'Published and corrected Field Notes require a publication date.',
      });
    }
    if (gatedLifecycleStates.has(note.lifecycle) && !note.dates.reviewed) {
      context.addIssue({
        code: 'custom',
        path: ['dates', 'reviewed'],
        message: `${note.lifecycle} Field Notes require a review date.`,
      });
    }
    const expectedShareImage = `/social/field-notes/${note.slug}.png`;
    if (note.shareImage && note.shareImage.src !== '/social/agentsutra-default.png') {
      if (note.shareImage.src !== expectedShareImage) {
        context.addIssue({
          code: 'custom',
          path: ['shareImage', 'src'],
          message: `The Field Note share image must match its slug: ${expectedShareImage}.`,
        });
      }
    }
    if (
      gatedLifecycleStates.has(note.lifecycle) &&
      (!note.shareImage || note.shareImage.src === '/social/agentsutra-default.png')
    ) {
      context.addIssue({
        code: 'custom',
        path: ['shareImage'],
        message: `${note.lifecycle} Field Notes require a note-specific 1200 × 630 share image.`,
      });
    }
    if (note.dates.updated < note.dates.created) {
      context.addIssue({
        code: 'custom',
        path: ['dates', 'updated'],
        message: 'A Field Note cannot be updated before it is created.',
      });
    }
    if (note.dates.reviewed && note.dates.reviewed > note.dates.updated) {
      context.addIssue({
        code: 'custom',
        path: ['dates', 'reviewed'],
        message: 'The review date cannot be later than the current update date.',
      });
    }
    if (note.dates.published && note.dates.published < note.dates.created) {
      context.addIssue({
        code: 'custom',
        path: ['dates', 'published'],
        message: 'A Field Note cannot be published before it is created.',
      });
    }
    if (note.dates.published && note.dates.published > note.dates.updated) {
      context.addIssue({
        code: 'custom',
        path: ['dates', 'published'],
        message: 'The publication date cannot be later than the current update date.',
      });
    }
    const relationIds = [
      ...note.relations.prerequisites,
      ...note.relations.related,
      ...(note.relations.next ? [note.relations.next] : []),
    ];
    if (relationIds.includes(note.id)) {
      context.addIssue({
        code: 'custom',
        path: ['relations'],
        message: 'A Field Note cannot relate to itself.',
      });
    }
  });

export type FieldNote = z.infer<typeof fieldNoteSchema>;
export type ShareImage = z.infer<typeof shareImageSchema>;
