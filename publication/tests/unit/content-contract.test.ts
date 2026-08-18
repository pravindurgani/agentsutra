import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  adaptationSchema,
  evidencePackSchema,
  fieldNoteSchema,
  threadDiagramSchema,
  type EvidencePack,
} from '../../src/schemas';
import { loadPublicationGraphFromDisk } from '../../src/lib/publication-graph-files';
import {
  PublicationGraphError,
  validatePublicationGraph,
  type PublicationGraphInput,
} from '../../src/lib/publication-graph';
import { defaultShareImage } from '../../src/lib/share-images';

const projectRoot = fileURLToPath(new URL('../../', import.meta.url));

async function fixtureGraph() {
  return loadPublicationGraphFromDisk({ root: projectRoot, includeFixtures: true });
}

describe('AgentSutra content contracts', () => {
  it('accepts the complete FN-000 synthetic fixture graph', async () => {
    const graph = await fixtureGraph();

    expect(graph.fieldNotes).toHaveLength(1);
    expect(graph.evidencePacks).toHaveLength(1);
    expect(graph.threadDiagrams).toHaveLength(1);
    expect(graph.adaptations).toHaveLength(4);
    expect(graph.interviews).toHaveLength(1);
    const note = graph.fieldNotes.at(0);
    const pack = graph.evidencePacks.at(0);
    expect(note).toMatchObject({
      id: 'FN-000',
      slug: 'fn-000-stress-test',
      lifecycle: 'draft',
      fixture: true,
      shareImage: defaultShareImage,
    });
    expect(pack?.evidence.every((item) => item.source.access === 'synthetic')).toBe(true);
  });

  it('excludes the fixture from the normal production graph', async () => {
    const graph = await loadPublicationGraphFromDisk({ root: projectRoot });

    expect(graph.fieldNotes).toEqual([]);
    expect(graph.evidencePacks).toEqual([]);
    expect(graph.threadDiagrams).toEqual([]);
    expect(graph.adaptations).toEqual([]);
    expect(graph.interviews).toEqual([]);
  });

  it('rejects a Field Note with its required boundary removed', async () => {
    const graph = await fixtureGraph();
    const note = graph.fieldNotes.at(0);
    if (!note) throw new Error('FN-000 fixture is missing.');
    const invalid = structuredClone(note) as unknown as Record<string, unknown>;
    const beats = invalid.beats as Record<string, unknown>;
    delete beats.boundary;

    expect(fieldNoteSchema.safeParse(invalid).success).toBe(false);
  });

  it('rejects an approved Field Note without a recorded review date', async () => {
    const graph = await fixtureGraph();
    const note = graph.fieldNotes.at(0);
    if (!note) throw new Error('FN-000 fixture is missing.');
    const invalid = structuredClone(note);
    invalid.lifecycle = 'approved';

    const result = fieldNoteSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message).join(' ')).toContain(
        'approved Field Notes require a review date.',
      );
    }
  });

  it('requires a note-specific 1200 × 630 share image before approval', async () => {
    const graph = await fixtureGraph();
    const note = graph.fieldNotes.at(0);
    if (!note) throw new Error('FN-000 fixture is missing.');
    const invalid = structuredClone(note);
    invalid.lifecycle = 'approved';
    invalid.dates.reviewed = invalid.dates.updated;

    const result = fieldNoteSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message).join(' ')).toContain(
        'approved Field Notes require a note-specific 1200 × 630 share image.',
      );
    }
  });

  it('rejects a Field Note share image whose filename does not match its slug', async () => {
    const graph = await fixtureGraph();
    const note = graph.fieldNotes.at(0);
    if (!note) throw new Error('FN-000 fixture is missing.');
    const invalid = structuredClone(note);
    invalid.shareImage = {
      ...defaultShareImage,
      src: '/social/field-notes/a-different-note.png',
    };

    const result = fieldNoteSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message).join(' ')).toContain(
        'The Field Note share image must match its slug: /social/field-notes/fn-000-stress-test.png.',
      );
    }
  });

  it('rejects more than five supporting claims', async () => {
    const graph = await fixtureGraph();
    const pack = graph.evidencePacks.at(0);
    if (!pack) throw new Error('EP-FN-000 fixture is missing.');
    const invalid = structuredClone(pack) as EvidencePack;
    invalid.supportingClaims.push({
      id: 'SC-5',
      claim:
        'A sixth synthetic support statement must be rejected even when its text otherwise satisfies the contract.',
    });

    const result = evidencePackSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === 'supportingClaims')).toBe(true);
    }
  });

  it('rejects a supporting claim without evidence coverage', async () => {
    const graph = await fixtureGraph();
    const pack = graph.evidencePacks.at(0);
    if (!pack) throw new Error('EP-FN-000 fixture is missing.');
    const invalid = structuredClone(pack);
    invalid.evidence.forEach((item) => {
      item.supports = item.supports.filter((claimId) => claimId !== 'SC-5');
    });

    const result = evidencePackSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message).join(' ')).toContain(
        'Supporting claim SC-5 has no evidence coverage.',
      );
    }
  });

  it('rejects a private evidence source that contains a filesystem locator', async () => {
    const graph = await fixtureGraph();
    const pack = graph.evidencePacks.at(0);
    if (!pack) throw new Error('EP-FN-000 fixture is missing.');
    const invalid = structuredClone(pack) as unknown as Record<string, unknown>;
    const evidence = invalid.evidence as Array<Record<string, unknown>>;
    const firstEvidence = evidence.at(0);
    if (!firstEvidence) throw new Error('Synthetic evidence fixture is missing.');
    firstEvidence.source = {
      access: 'private',
      privateEvidenceId: 'PE-SYNTHETIC-FN000',
      publicDescription:
        'An opaque synthetic reference with no publishable operational location or identifying detail.',
      locator: '/redacted/private-evidence/report.json',
    };

    expect(evidencePackSchema.safeParse(invalid).success).toBe(false);
  });

  it('rejects an approved Risk D pack without measurement and independent review gates', async () => {
    const graph = await fixtureGraph();
    const pack = graph.evidencePacks.at(0);
    if (!pack) throw new Error('EP-FN-000 fixture is missing.');
    const invalid = structuredClone(pack) as unknown as Record<string, unknown>;
    invalid.riskClass = 'D';
    invalid.lifecycle = 'approved';
    const evidence = invalid.evidence as Array<Record<string, unknown>>;
    evidence[0] = {
      ...evidence[0],
      kind: 'repository',
      source: {
        access: 'public',
        url: 'https://example.invalid/synthetic-record',
        label: 'Synthetic public source placeholder',
      },
      verification: 'historical',
    };

    const result = evidencePackSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message).join(' ');
      expect(messages).toContain('versioned measurement record');
      expect(messages).toContain('independent high-risk review');
    }
  });

  it('requires verified Risk C evidence to cover the central claim itself', async () => {
    const graph = await fixtureGraph();
    const pack = graph.evidencePacks.at(0);
    if (!pack) throw new Error('EP-FN-000 fixture is missing.');
    const invalid = structuredClone(pack) as EvidencePack;
    invalid.riskClass = 'C';
    invalid.lifecycle = 'approved';
    invalid.privacy.classification = 'public';
    invalid.evidence[0] = {
      ...invalid.evidence[0]!,
      kind: 'repository',
      source: {
        access: 'public',
        url: 'https://example.invalid/historical-central-record',
        label: 'Synthetic historical central-record placeholder',
      },
      verification: 'historical',
    };
    invalid.evidence.push({
      id: 'EV-FN-000-02',
      kind: 'experiment',
      source: {
        access: 'public',
        url: 'https://example.invalid/verified-support-record',
        label: 'Synthetic verified supporting-record placeholder',
      },
      supports: ['SC-1'],
      verification: 'verified',
      observedAt: '2026-08-17',
      finding:
        'This synthetic result exists only to exercise supporting-claim verification coverage.',
      method: 'A synthetic method exists only to exercise central-claim verification coverage.',
      limitation: 'This placeholder does not establish the truth of any actual public claim.',
    });
    invalid.measurement = {
      version: 'synthetic-v1',
      denominator: 1,
      environment: 'A synthetic environment exists only for contract validation.',
      method: 'A synthetic measurement method exists only for contract validation.',
      measuredAt: '2026-08-17',
    };

    const result = evidencePackSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message).join(' ')).toContain(
        'verified evidence for the central claim',
      );
    }
  });

  it('fails closed when a gated evidence pack has not passed privacy review', async () => {
    const graph = await fixtureGraph();
    const pack = graph.evidencePacks.at(0);
    if (!pack) throw new Error('EP-FN-000 fixture is missing.');
    const invalid = structuredClone(pack);
    invalid.lifecycle = 'approved';
    invalid.privacy.reviewed = false;

    const result = evidencePackSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message).join(' ')).toContain(
        'approved evidence must pass privacy review.',
      );
    }
  });

  it('rejects synthetic evidence in any gated publication lifecycle', async () => {
    const graph = await fixtureGraph();
    const pack = graph.evidencePacks.at(0);
    if (!pack) throw new Error('EP-FN-000 fixture is missing.');
    const invalid = structuredClone(pack);
    invalid.lifecycle = 'approved';

    const result = evidencePackSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message).join(' ')).toContain(
        'approved evidence cannot rely on synthetic sources',
      );
    }
  });

  it.each(['B', 'C', 'D'] as const)(
    'rejects an approved Risk %s pack backed only by synthetic sources',
    async (riskClass) => {
      const graph = await fixtureGraph();
      const pack = graph.evidencePacks.at(0);
      if (!pack) throw new Error('EP-FN-000 fixture is missing.');
      const invalid = structuredClone(pack);
      invalid.riskClass = riskClass;
      invalid.lifecycle = 'approved';

      const result = evidencePackSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.map((issue) => issue.message).join(' ')).toContain(
          'approved evidence cannot rely on synthetic sources',
        );
      }
    },
  );

  it('rejects self-review disguised as independent Risk D review metadata', async () => {
    const graph = await fixtureGraph();
    const pack = graph.evidencePacks.at(0);
    if (!pack) throw new Error('EP-FN-000 fixture is missing.');
    const invalid = structuredClone(pack) as EvidencePack;
    invalid.highRiskReview = {
      threatModel: 'A synthetic threat statement exists only to exercise the rejection path.',
      executableTestEvidenceId: 'EV-FN-000-01',
      residualRisk: 'This synthetic metadata does not represent a real security assessment.',
      independentReviewer: {
        id: 'RVW-SYNTHETIC-REVIEWER',
        kind: 'human',
        displayName: 'Self',
        relevantExpertise:
          'This fictional expertise statement exists only to exercise schema rejection.',
        relationship: 'This fictional relationship exists only to exercise schema rejection.',
        attestation:
          'This fictional attestation does not approve or validate a real security claim.',
      },
      reviewedAt: '2026-08-17',
      status: 'approved',
    };

    const result = evidencePackSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message).join(' ')).toContain(
        'independent reviewer cannot be recorded as self',
      );
    }
  });

  it('rejects a non-synthetic evidence kind backed by a synthetic source', async () => {
    const graph = await fixtureGraph();
    const pack = graph.evidencePacks.at(0);
    if (!pack) throw new Error('EP-FN-000 fixture is missing.');
    const invalid = structuredClone(pack);
    invalid.evidence[0]!.kind = 'repository';

    const result = evidencePackSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message).join(' ')).toContain(
        'cannot use a synthetic source for kind repository',
      );
    }
  });

  it('rejects correction status that does not match the evidence lifecycle', async () => {
    const graph = await fixtureGraph();
    const pack = graph.evidencePacks.at(0);
    if (!pack) throw new Error('EP-FN-000 fixture is missing.');
    const invalid = structuredClone(pack);
    invalid.correctionStatus = 'corrected';

    const result = evidencePackSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message).join(' ')).toContain(
        'Correction status corrected requires lifecycle corrected.',
      );
    }
  });

  it('rejects high-risk review metadata on a lower-risk evidence pack', async () => {
    const graph = await fixtureGraph();
    const pack = graph.evidencePacks.at(0);
    if (!pack) throw new Error('EP-FN-000 fixture is missing.');
    const invalid = structuredClone(pack) as EvidencePack;
    invalid.highRiskReview = {
      threatModel: 'A synthetic threat statement exists only to exercise the rejection path.',
      executableTestEvidenceId: 'EV-FN-000-01',
      residualRisk: 'This synthetic metadata does not represent a real security assessment.',
      independentReviewer: {
        id: 'RVW-SYNTHETIC-REVIEWER',
        kind: 'human',
        displayName: 'Synthetic reviewer',
        relevantExpertise:
          'This fictional expertise statement exists only to exercise schema rejection.',
        relationship: 'This fictional relationship exists only to exercise schema rejection.',
        attestation:
          'This fictional attestation does not approve or validate a real security claim.',
      },
      reviewedAt: '2026-08-17',
      status: 'approved',
    };

    const result = evidencePackSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message).join(' ')).toContain(
        'reserved for Risk D packs',
      );
    }
  });

  it('rejects an AI agent as the independent reviewer for a Risk D record', async () => {
    const graph = await fixtureGraph();
    const pack = graph.evidencePacks.at(0);
    if (!pack) throw new Error('EP-FN-000 fixture is missing.');
    const invalid = structuredClone(pack) as unknown as Record<string, unknown>;
    invalid.highRiskReview = {
      threatModel: 'A synthetic threat statement exists only to exercise the rejection path.',
      executableTestEvidenceId: 'EV-FN-000-01',
      residualRisk: 'This synthetic metadata does not represent a real security assessment.',
      independentReviewer: {
        id: 'RVW-SYNTHETIC-REVIEWER',
        kind: 'ai-agent',
        displayName: 'Synthetic review agent',
        relevantExpertise:
          'This fictional expertise statement exists only to exercise schema rejection.',
        relationship: 'This fictional relationship exists only to exercise schema rejection.',
        attestation:
          'This fictional attestation does not approve or validate a real security claim.',
      },
      reviewedAt: '2026-08-17',
      status: 'approved',
    };

    const result = evidencePackSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message).join(' ')).toContain(
        'Risk D independent review must be completed by a human reviewer.',
      );
    }
  });

  it('rejects the accountable editor as an independent Risk D reviewer', async () => {
    const graph = await fixtureGraph();
    const pack = graph.evidencePacks.at(0);
    if (!pack) throw new Error('EP-FN-000 fixture is missing.');
    const invalid = structuredClone(pack) as EvidencePack;
    invalid.highRiskReview = {
      threatModel: 'A synthetic threat statement exists only to exercise the rejection path.',
      executableTestEvidenceId: 'EV-FN-000-01',
      residualRisk: 'This synthetic metadata does not represent a real security assessment.',
      independentReviewer: {
        id: 'RVW-SYNTHETIC-REVIEWER',
        kind: 'human',
        displayName: '  PRAVIN   DURGANI  ',
        relevantExpertise:
          'This fictional expertise statement exists only to exercise schema rejection.',
        relationship: 'This fictional relationship exists only to exercise schema rejection.',
        attestation:
          'This fictional attestation does not approve or validate a real security claim.',
      },
      reviewedAt: '2026-08-17',
      status: 'approved',
    };

    const result = evidencePackSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message).join(' ')).toContain(
        'The accountable author or editor cannot be recorded as an independent reviewer.',
      );
    }
  });

  it('enforces the canonical Field Note path on every platform adaptation', async () => {
    const graph = await fixtureGraph();
    const input = structuredClone(graph) as unknown as PublicationGraphInput;
    const adaptation = input.adaptations.at(0);
    if (!adaptation) throw new Error('FN-000 adaptation fixture is missing.');
    adaptation.canonicalPath = '/field-notes/a-different-slug/';

    expect(() => validatePublicationGraph(input)).toThrow(PublicationGraphError);
    expect(() => validatePublicationGraph(input)).toThrow(/canonicalPath must equal/);
  });

  it('rejects an adaptation linked to a different evidence pack', async () => {
    const graph = await fixtureGraph();
    const input = structuredClone(graph) as unknown as PublicationGraphInput;
    const adaptation = input.adaptations.at(0);
    if (!adaptation) throw new Error('FN-000 adaptation fixture is missing.');
    adaptation.evidencePackId = 'EP-FN-999';

    expect(() => validatePublicationGraph(input)).toThrow(/must derive public evidence state/);
  });

  it('requires LinkedIn attribution without exposing it on faceless publication-led platforms', async () => {
    const graph = await fixtureGraph();
    const linkedIn = graph.adaptations.find((adaptation) => adaptation.platform === 'linkedin');
    const instagram = graph.adaptations.find((adaptation) => adaptation.platform === 'instagram');
    if (!linkedIn || !instagram) throw new Error('Platform fixtures are incomplete.');

    const missingAttribution = structuredClone(linkedIn);
    delete missingAttribution.attribution;
    expect(adaptationSchema.safeParse(missingAttribution).success).toBe(false);

    const exposedAttribution = structuredClone(instagram) as typeof instagram & {
      attribution: NonNullable<typeof linkedIn.attribution>;
    };
    exposedAttribution.attribution = linkedIn.attribution!;
    expect(adaptationSchema.safeParse(exposedAttribution).success).toBe(false);
  });

  it('rejects incompatible evidence and adaptation lifecycle states', async () => {
    const graph = await fixtureGraph();
    const input = structuredClone(graph) as unknown as PublicationGraphInput;
    const note = input.fieldNotes.at(0);
    const pack = input.evidencePacks.at(0);
    const adaptation = input.adaptations.at(0);
    if (!note || !pack || !adaptation) throw new Error('FN-000 fixture graph is incomplete.');
    note.lifecycle = 'approved';
    pack.lifecycle = 'draft';
    adaptation.lifecycle = 'draft';

    expect(() => validatePublicationGraph(input)).toThrow(/lifecycle approved is incompatible/);
  });

  it('rejects more than one declared adaptation for the same platform', async () => {
    const graph = await fixtureGraph();
    const input = structuredClone(graph) as unknown as PublicationGraphInput;
    const reddit = input.adaptations.find((adaptation) => adaptation.platform === 'reddit');
    if (!reddit) throw new Error('Reddit adaptation fixture is missing.');
    reddit.platform = 'instagram';

    expect(() => validatePublicationGraph(input)).toThrow(
      /declares more than one instagram adaptation/,
    );
  });

  it('enforces each platform adaptation export contract', async () => {
    const graph = await fixtureGraph();
    const linkedIn = graph.adaptations.find((adaptation) => adaptation.platform === 'linkedin');
    if (!linkedIn) throw new Error('LinkedIn adaptation fixture is missing.');
    const invalid = structuredClone(linkedIn);
    invalid.export.format = 'png';

    const result = adaptationSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message).join(' ')).toContain(
        'linkedin exports must use pdf.',
      );
    }
  });

  it('rejects platform adaptations that omit a required semantic frame', async () => {
    const graph = await fixtureGraph();
    const instagram = graph.adaptations.find((adaptation) => adaptation.platform === 'instagram');
    if (!instagram) throw new Error('Instagram adaptation fixture is missing.');
    const invalid = structuredClone(instagram);
    invalid.frames = invalid.frames
      .filter((frame) => frame.role !== 'boundary')
      .map((frame, index) => ({ ...frame, index: index + 1 }));

    const result = adaptationSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message).join(' ')).toContain(
        'instagram adaptations require a boundary frame.',
      );
    }
  });

  it('rejects platform adaptations with incorrect export dimensions', async () => {
    const graph = await fixtureGraph();
    const tiktok = graph.adaptations.find((adaptation) => adaptation.platform === 'tiktok');
    if (!tiktok || tiktok.export.format !== 'png') {
      throw new Error('TikTok PNG adaptation fixture is missing.');
    }
    const invalid = structuredClone(tiktok);
    if (invalid.export.format !== 'png') throw new Error('TikTok export contract changed.');
    invalid.export.height = 1350;

    const result = adaptationSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message).join(' ')).toContain(
        'tiktok exports must be 1080×1920 PNG.',
      );
    }
  });

  it('models Reddit as a Markdown package rather than a raster-only export', async () => {
    const graph = await fixtureGraph();
    const reddit = graph.adaptations.find((adaptation) => adaptation.platform === 'reddit');
    if (!reddit) throw new Error('Reddit adaptation fixture is missing.');

    expect(reddit.export).toEqual({ format: 'markdown' });
    expect(adaptationSchema.safeParse(reddit).success).toBe(true);
  });

  it('rejects a Thread diagram without visible semantic text steps', async () => {
    const graph = await fixtureGraph();
    const diagram = graph.threadDiagrams.at(0);
    if (!diagram) throw new Error('TD-FN-000 fixture is missing.');
    const invalid = structuredClone(diagram);
    invalid.textSteps = [];

    expect(threadDiagramSchema.safeParse(invalid).success).toBe(false);
  });
});
