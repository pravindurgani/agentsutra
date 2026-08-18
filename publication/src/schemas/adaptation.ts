import { z } from 'astro/zod';

import {
  adaptationIdSchema,
  evidencePackIdSchema,
  fieldNoteIdSchema,
  lifecycleSchema,
  nonEmptyTextSchema,
  schemaVersionSchema,
  sentenceSchema,
  threadDiagramIdSchema,
} from './shared';

const platformSchema = z.enum(['instagram', 'tiktok', 'linkedin', 'reddit']);

const platformCode = {
  instagram: 'IG',
  tiktok: 'TT',
  linkedin: 'LI',
  reddit: 'RD',
} as const;

export const platformAdaptationContracts = {
  instagram: {
    format: 'carousel',
    width: 1080,
    height: 1350,
    exportFormat: 'png',
    requiredRoles: ['cover', 'boundary', 'transfer'],
  },
  tiktok: {
    format: 'photo-post',
    width: 1080,
    height: 1920,
    exportFormat: 'png',
    requiredRoles: ['cover', 'boundary'],
  },
  linkedin: {
    format: 'document',
    width: 1080,
    height: 1350,
    exportFormat: 'pdf',
    requiredRoles: ['cover', 'boundary', 'depth-door'],
  },
  reddit: {
    format: 'text-post',
    exportFormat: 'markdown',
    requiredRoles: ['problem', 'boundary'],
  },
} as const;

const adaptationExportSchema = z.discriminatedUnion('format', [
  z
    .object({
      format: z.literal('png'),
      width: z.number().int().min(320).max(2_400),
      height: z.number().int().min(320).max(2_400),
    })
    .strict(),
  z
    .object({
      format: z.literal('pdf'),
      width: z.number().int().min(320).max(2_400),
      height: z.number().int().min(320).max(2_400),
    })
    .strict(),
  z
    .object({
      format: z.literal('markdown'),
      companionImage: z
        .object({
          width: z.number().int().min(320).max(2_400),
          height: z.number().int().min(320).max(2_400),
          format: z.literal('png'),
        })
        .strict()
        .optional(),
    })
    .strict(),
]);

export const adaptationSchema = z
  .object({
    schemaVersion: schemaVersionSchema,
    id: adaptationIdSchema,
    fieldNoteId: fieldNoteIdSchema,
    evidencePackId: evidencePackIdSchema,
    platform: platformSchema,
    format: z.enum(['carousel', 'photo-post', 'document', 'text-post']),
    lifecycle: lifecycleSchema,
    centralClaim: sentenceSchema,
    canonicalPath: z.string().regex(/^\/field-notes\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/),
    frames: z
      .array(
        z
          .object({
            index: z.number().int().min(1).max(20),
            role: z.enum([
              'cover',
              'problem',
              'naive-model',
              'mechanism',
              'evidence',
              'boundary',
              'transfer',
              'memory-line',
              'depth-door',
            ]),
            heading: nonEmptyTextSchema.max(110),
            body: nonEmptyTextSchema.max(420),
            altText: sentenceSchema,
            diagramId: threadDiagramIdSchema.optional(),
          })
          .strict(),
      )
      .min(1)
      .max(12),
    caption: nonEmptyTextSchema.max(2_200),
    attribution: z
      .object({
        byline: nonEmptyTextSchema.max(120),
        relationship: sentenceSchema,
        reflection: sentenceSchema,
      })
      .strict()
      .optional(),
    export: adaptationExportSchema,
  })
  .strict()
  .superRefine((adaptation, context) => {
    if (!adaptation.id.endsWith(`-${platformCode[adaptation.platform]}`)) {
      context.addIssue({
        code: 'custom',
        path: ['id'],
        message: `Adaptation ID suffix must match ${adaptation.platform}.`,
      });
    }
    const contract = platformAdaptationContracts[adaptation.platform];
    if (adaptation.platform === 'linkedin' && !adaptation.attribution) {
      context.addIssue({
        code: 'custom',
        path: ['attribution'],
        message: 'LinkedIn documents require an explicit professional byline and reflection.',
      });
    }
    if (adaptation.platform !== 'linkedin' && adaptation.attribution) {
      context.addIssue({
        code: 'custom',
        path: ['attribution'],
        message: `${adaptation.platform} adaptations must preserve the faceless, publication-led AgentSutra identity.`,
      });
    }
    if (adaptation.format !== contract.format) {
      context.addIssue({
        code: 'custom',
        path: ['format'],
        message: `${adaptation.platform} adaptations must use ${contract.format}.`,
      });
    }
    if (adaptation.export.format !== contract.exportFormat) {
      context.addIssue({
        code: 'custom',
        path: ['export'],
        message: `${adaptation.platform} exports must use ${contract.exportFormat}.`,
      });
    } else if (
      adaptation.export.format !== 'markdown' &&
      'width' in contract &&
      (adaptation.export.width !== contract.width || adaptation.export.height !== contract.height)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['export'],
        message: `${adaptation.platform} exports must be ${contract.width}×${contract.height} ${contract.exportFormat.toUpperCase()}.`,
      });
    }
    const roles = new Set(adaptation.frames.map((frame) => frame.role));
    for (const role of contract.requiredRoles) {
      if (!roles.has(role)) {
        context.addIssue({
          code: 'custom',
          path: ['frames'],
          message: `${adaptation.platform} adaptations require a ${role} frame.`,
        });
      }
    }
    const indices = adaptation.frames.map((frame) => frame.index);
    const expected = indices.map((_, index) => index + 1);
    if (indices.some((value, index) => value !== expected[index])) {
      context.addIssue({
        code: 'custom',
        path: ['frames'],
        message: 'Adaptation frame indices must be contiguous and start at 1.',
      });
    }
  });

export type Adaptation = z.infer<typeof adaptationSchema>;
