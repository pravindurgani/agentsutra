import { z } from 'astro/zod';

import {
  evidencePackIdSchema,
  evidenceSourceSchema,
  fieldNoteIdSchema,
  gatedLifecycleStates,
  isoDateSchema,
  lifecycleSchema,
  nonEmptyTextSchema,
  riskClassSchema,
  schemaVersionSchema,
  sentenceSchema,
} from './shared';

const supportClaimSchema = z
  .object({
    id: z.string().regex(/^SC-[1-5]$/),
    claim: sentenceSchema,
  })
  .strict();

const evidenceItemSchema = z
  .object({
    id: z.string().regex(/^EV-FN-\d{3}-\d{2}$/),
    kind: z.enum([
      'primary-source',
      'repository',
      'experiment',
      'observation',
      'executable-test',
      'synthetic',
    ]),
    source: evidenceSourceSchema,
    supports: z.array(z.union([z.literal('central'), z.string().regex(/^SC-[1-5]$/)])).min(1),
    verification: z.enum(['unverified', 'historical', 'reproduced', 'verified']),
    observedAt: isoDateSchema,
    finding: sentenceSchema,
    method: sentenceSchema,
    limitation: sentenceSchema,
  })
  .strict();

const measurementSchema = z
  .object({
    version: nonEmptyTextSchema.max(120),
    denominator: z.number().int().positive(),
    environment: sentenceSchema,
    method: sentenceSchema,
    measuredAt: isoDateSchema,
  })
  .strict();

const highRiskReviewSchema = z
  .object({
    threatModel: sentenceSchema,
    executableTestEvidenceId: z.string().regex(/^EV-FN-\d{3}-\d{2}$/),
    residualRisk: sentenceSchema,
    independentReviewer: z
      .object({
        id: z.string().regex(/^RVW-[A-Z0-9][A-Z0-9-]{5,80}$/),
        displayName: nonEmptyTextSchema
          .max(120)
          .refine((value) => !/^(?:self|author|owner)$/iu.test(value), {
            message: 'An independent reviewer cannot be recorded as self, author, or owner.',
          }),
        relationship: sentenceSchema,
        attestation: sentenceSchema,
      })
      .strict(),
    reviewedAt: isoDateSchema,
    status: z.literal('approved'),
  })
  .strict();

export const evidencePackSchema = z
  .object({
    schemaVersion: schemaVersionSchema,
    id: evidencePackIdSchema,
    fieldNoteId: fieldNoteIdSchema,
    riskClass: riskClassSchema,
    lifecycle: lifecycleSchema,
    centralClaim: sentenceSchema,
    supportingClaims: z.array(supportClaimSchema).max(5),
    evidence: z.array(evidenceItemSchema).min(1).max(20),
    boundary: z
      .object({
        statement: sentenceSchema,
        doesNotProve: z.array(sentenceSchema).min(1).max(8),
      })
      .strict(),
    transfer: z
      .object({
        action: sentenceSchema,
        precondition: sentenceSchema,
      })
      .strict(),
    privacy: z
      .object({
        classification: z.enum(['public', 'sanitised', 'synthetic']),
        reviewed: z.boolean(),
        note: sentenceSchema,
      })
      .strict(),
    measurement: measurementSchema.optional(),
    highRiskReview: highRiskReviewSchema.optional(),
    correctionStatus: z.enum(['none', 'open', 'corrected', 'withdrawn']),
  })
  .strict()
  .superRefine((pack, context) => {
    const supportIds = new Set<string>();
    for (const claim of pack.supportingClaims) {
      if (supportIds.has(claim.id)) {
        context.addIssue({
          code: 'custom',
          path: ['supportingClaims'],
          message: `Duplicate supporting claim ID: ${claim.id}.`,
        });
      }
      supportIds.add(claim.id);
    }

    const evidenceIds = new Set<string>();
    for (const item of pack.evidence) {
      if (evidenceIds.has(item.id)) {
        context.addIssue({
          code: 'custom',
          path: ['evidence'],
          message: `Duplicate evidence ID: ${item.id}.`,
        });
      }
      evidenceIds.add(item.id);
      if (item.kind === 'synthetic' && item.source.access !== 'synthetic') {
        context.addIssue({
          code: 'custom',
          path: ['evidence'],
          message: `Evidence ${item.id} declares a synthetic kind but a non-synthetic source.`,
        });
      }
      if (item.kind !== 'synthetic' && item.source.access === 'synthetic') {
        context.addIssue({
          code: 'custom',
          path: ['evidence'],
          message: `Evidence ${item.id} cannot use a synthetic source for kind ${item.kind}.`,
        });
      }
      for (const supportedClaim of item.supports) {
        if (supportedClaim !== 'central' && !supportIds.has(supportedClaim)) {
          context.addIssue({
            code: 'custom',
            path: ['evidence'],
            message: `Evidence ${item.id} references unknown claim ${supportedClaim}.`,
          });
        }
      }
    }

    if (!pack.evidence.some((item) => item.supports.includes('central'))) {
      context.addIssue({
        code: 'custom',
        path: ['evidence'],
        message: 'At least one evidence item must support the central claim.',
      });
    }

    for (const supportId of supportIds) {
      if (!pack.evidence.some((item) => item.supports.includes(supportId))) {
        context.addIssue({
          code: 'custom',
          path: ['supportingClaims'],
          message: `Supporting claim ${supportId} has no evidence coverage.`,
        });
      }
    }

    const containsPrivateEvidence = pack.evidence.some((item) => item.source.access === 'private');
    const containsNonSyntheticEvidence = pack.evidence.some(
      (item) => item.source.access !== 'synthetic',
    );
    if (containsPrivateEvidence && pack.privacy.classification !== 'sanitised') {
      context.addIssue({
        code: 'custom',
        path: ['privacy', 'classification'],
        message: 'A pack with private evidence references must be classified as sanitised.',
      });
    }
    if (!containsNonSyntheticEvidence && pack.privacy.classification !== 'synthetic') {
      context.addIssue({
        code: 'custom',
        path: ['privacy', 'classification'],
        message: 'A wholly synthetic evidence pack must be classified as synthetic.',
      });
    }
    if (containsNonSyntheticEvidence && pack.privacy.classification === 'synthetic') {
      context.addIssue({
        code: 'custom',
        path: ['privacy', 'classification'],
        message: 'A pack containing real evidence cannot be classified as synthetic.',
      });
    }

    if (
      (gatedLifecycleStates.has(pack.lifecycle) || pack.lifecycle === 'withdrawn') &&
      !pack.privacy.reviewed
    ) {
      context.addIssue({
        code: 'custom',
        path: ['privacy', 'reviewed'],
        message: `${pack.lifecycle} evidence must pass privacy review.`,
      });
    }

    const expectedCorrectionLifecycle = {
      open: 'published',
      corrected: 'corrected',
      withdrawn: 'withdrawn',
    } as const;
    if (
      pack.correctionStatus !== 'none' &&
      pack.lifecycle !== expectedCorrectionLifecycle[pack.correctionStatus]
    ) {
      context.addIssue({
        code: 'custom',
        path: ['correctionStatus'],
        message: `Correction status ${pack.correctionStatus} requires lifecycle ${expectedCorrectionLifecycle[pack.correctionStatus]}.`,
      });
    }
    if (
      pack.correctionStatus === 'none' &&
      (pack.lifecycle === 'corrected' || pack.lifecycle === 'withdrawn')
    ) {
      context.addIssue({
        code: 'custom',
        path: ['correctionStatus'],
        message: `Lifecycle ${pack.lifecycle} requires a matching correction status.`,
      });
    }

    if (pack.highRiskReview && pack.riskClass !== 'D') {
      context.addIssue({
        code: 'custom',
        path: ['highRiskReview'],
        message: 'Independent high-risk review records are reserved for Risk D packs.',
      });
    }

    if (!gatedLifecycleStates.has(pack.lifecycle)) return;

    if (
      pack.privacy.classification === 'synthetic' ||
      pack.evidence.some((item) => item.kind === 'synthetic' || item.source.access === 'synthetic')
    ) {
      context.addIssue({
        code: 'custom',
        path: ['evidence'],
        message: `${pack.lifecycle} evidence cannot rely on synthetic sources or synthetic evidence kinds.`,
      });
    }

    if (
      pack.riskClass !== 'A' &&
      !pack.evidence.some(
        (item) =>
          item.kind !== 'synthetic' &&
          item.source.access !== 'synthetic' &&
          item.verification !== 'unverified',
      )
    ) {
      context.addIssue({
        code: 'custom',
        path: ['evidence'],
        message: `Risk ${pack.riskClass} requires direct, non-synthetic evidence before approval.`,
      });
    }

    if (pack.riskClass !== 'A') {
      for (const claimId of ['central', ...supportIds]) {
        const hasQualifyingEvidence = pack.evidence.some(
          (item) =>
            item.kind !== 'synthetic' &&
            item.source.access !== 'synthetic' &&
            item.verification !== 'unverified' &&
            item.supports.includes(claimId),
        );
        if (!hasQualifyingEvidence) {
          context.addIssue({
            code: 'custom',
            path: ['evidence'],
            message: `Risk ${pack.riskClass} claim ${claimId} requires direct, non-synthetic evidence before approval.`,
          });
        }
      }
    }

    if (pack.riskClass === 'C' || pack.riskClass === 'D') {
      if (!pack.measurement) {
        context.addIssue({
          code: 'custom',
          path: ['measurement'],
          message: `Risk ${pack.riskClass} requires a versioned measurement record before approval.`,
        });
      }
      if (
        !pack.evidence.some(
          (item) =>
            item.kind !== 'synthetic' &&
            item.source.access !== 'synthetic' &&
            item.verification === 'verified' &&
            item.supports.includes('central'),
        )
      ) {
        context.addIssue({
          code: 'custom',
          path: ['evidence'],
          message: `Risk ${pack.riskClass} requires verified evidence for the central claim before approval.`,
        });
      }
    }

    if (pack.riskClass === 'D') {
      const review = pack.highRiskReview;
      if (!review) {
        context.addIssue({
          code: 'custom',
          path: ['highRiskReview'],
          message: 'Risk D requires an approved independent high-risk review.',
        });
      } else {
        const executableEvidence = pack.evidence.find(
          (item) => item.id === review.executableTestEvidenceId,
        );
        if (
          !executableEvidence ||
          executableEvidence.kind !== 'executable-test' ||
          executableEvidence.source.access === 'synthetic' ||
          executableEvidence.verification !== 'verified'
        ) {
          context.addIssue({
            code: 'custom',
            path: ['highRiskReview', 'executableTestEvidenceId'],
            message: 'Risk D review must reference verified executable-test evidence in this pack.',
          });
        }
      }
    }
  });

export type EvidencePack = z.infer<typeof evidencePackSchema>;
