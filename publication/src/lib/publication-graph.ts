import type { Adaptation, EvidencePack, FieldNote, Interview, ThreadDiagram } from '../schemas';
import type { Lifecycle } from '../schemas/shared';

export interface PublicationGraphInput {
  fieldNotes: FieldNote[];
  evidencePacks: EvidencePack[];
  threadDiagrams: ThreadDiagram[];
  adaptations: Adaptation[];
  interviews: Interview[];
}

export interface PublicationGraph extends PublicationGraphInput {
  byId: {
    fieldNotes: ReadonlyMap<string, FieldNote>;
    evidencePacks: ReadonlyMap<string, EvidencePack>;
    threadDiagrams: ReadonlyMap<string, ThreadDiagram>;
    adaptations: ReadonlyMap<string, Adaptation>;
    interviews: ReadonlyMap<string, Interview>;
  };
}

export class PublicationGraphError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(`AgentSutra publication graph is invalid:\n- ${issues.join('\n- ')}`);
    this.name = 'PublicationGraphError';
    this.issues = issues;
  }
}

const evidenceLifecycleCompatibility: Record<Lifecycle, ReadonlySet<Lifecycle>> = {
  draft: new Set(['draft', 'review', 'approved']),
  review: new Set(['review', 'approved']),
  approved: new Set(['approved']),
  published: new Set(['published', 'corrected']),
  corrected: new Set(['corrected']),
  withdrawn: new Set(['withdrawn']),
};

const adaptationLifecycleCompatibility: Record<Lifecycle, ReadonlySet<Lifecycle>> = {
  draft: new Set(['draft', 'review', 'approved']),
  review: new Set(['review', 'approved']),
  approved: new Set(['approved']),
  published: new Set(['approved', 'published', 'corrected']),
  corrected: new Set(['corrected', 'withdrawn']),
  withdrawn: new Set(['withdrawn']),
};

function lifecycleIsCompatible(
  noteLifecycle: Lifecycle,
  linkedLifecycle: Lifecycle,
  compatibility: Record<Lifecycle, ReadonlySet<Lifecycle>>,
): boolean {
  return compatibility[noteLifecycle].has(linkedLifecycle);
}

function indexById<T extends { id: string }>(
  records: readonly T[],
  label: string,
  issues: string[],
): Map<string, T> {
  const index = new Map<string, T>();
  for (const record of records) {
    if (index.has(record.id)) issues.push(`Duplicate ${label} ID: ${record.id}.`);
    index.set(record.id, record);
  }
  return index;
}

export function validatePublicationGraph(input: PublicationGraphInput): PublicationGraph {
  const issues: string[] = [];
  const fieldNotes = indexById(input.fieldNotes, 'Field Note', issues);
  const evidencePacks = indexById(input.evidencePacks, 'evidence pack', issues);
  const threadDiagrams = indexById(input.threadDiagrams, 'Thread diagram', issues);
  const adaptations = indexById(input.adaptations, 'adaptation', issues);
  const interviews = indexById(input.interviews, 'interview record', issues);

  const fixtures = input.fieldNotes.filter((note) => note.fixture);
  if (fixtures.length > 1 || fixtures.some((note) => note.id !== 'FN-000')) {
    issues.push('FN-000 must be the only synthetic Field Note fixture.');
  }

  for (const note of input.fieldNotes) {
    const evidencePack = evidencePacks.get(note.evidencePackId);
    const diagram = threadDiagrams.get(note.diagramId);
    const interview = interviews.get(note.interviewId);

    if (!evidencePack) {
      issues.push(`${note.id} references missing evidence pack ${note.evidencePackId}.`);
    } else {
      if (evidencePack.fieldNoteId !== note.id) {
        issues.push(`${evidencePack.id} belongs to ${evidencePack.fieldNoteId}, not ${note.id}.`);
      }
      if (evidencePack.riskClass !== note.riskClass) {
        issues.push(`${note.id} and ${evidencePack.id} use different risk classes.`);
      }
      if (evidencePack.centralClaim !== note.centralClaim) {
        issues.push(`${note.id} and ${evidencePack.id} do not share the exact central claim.`);
      }
      if (
        !lifecycleIsCompatible(
          note.lifecycle,
          evidencePack.lifecycle,
          evidenceLifecycleCompatibility,
        )
      ) {
        issues.push(
          `${note.id} lifecycle ${note.lifecycle} is incompatible with ${evidencePack.id} lifecycle ${evidencePack.lifecycle}.`,
        );
      }
    }

    if (!diagram) {
      issues.push(`${note.id} references missing Thread diagram ${note.diagramId}.`);
    } else if (diagram.fieldNoteId !== note.id) {
      issues.push(`${diagram.id} belongs to ${diagram.fieldNoteId}, not ${note.id}.`);
    }

    if (!interview) {
      issues.push(`${note.id} references missing interview record ${note.interviewId}.`);
    } else {
      if (interview.fieldNoteId !== note.id) {
        issues.push(`${interview.id} belongs to ${interview.fieldNoteId}, not ${note.id}.`);
      }
      if (interview.centralClaim !== note.centralClaim) {
        issues.push(`${note.id} and ${interview.id} do not share the exact central claim.`);
      }
    }

    const declaredAdaptations = new Set(note.adaptationIds);
    if (declaredAdaptations.size !== note.adaptationIds.length) {
      issues.push(`${note.id} declares the same adaptation more than once.`);
    }
    const declaredPlatforms = new Set<Adaptation['platform']>();
    for (const adaptationId of declaredAdaptations) {
      const adaptation = adaptations.get(adaptationId);
      if (!adaptation) {
        issues.push(`${note.id} references missing adaptation ${adaptationId}.`);
        continue;
      }
      if (adaptation.fieldNoteId !== note.id) {
        issues.push(`${adaptation.id} belongs to ${adaptation.fieldNoteId}, not ${note.id}.`);
      }
      if (adaptation.evidencePackId !== note.evidencePackId) {
        issues.push(
          `${adaptation.id} must derive public evidence state from ${note.evidencePackId}, received ${adaptation.evidencePackId}.`,
        );
      }
      if (adaptation.centralClaim !== note.centralClaim) {
        issues.push(`${note.id} and ${adaptation.id} do not share the exact central claim.`);
      }
      const expectedCanonicalPath = `/field-notes/${note.slug}/`;
      if (adaptation.canonicalPath !== expectedCanonicalPath) {
        issues.push(
          `${adaptation.id} canonicalPath must equal ${expectedCanonicalPath}, received ${adaptation.canonicalPath}.`,
        );
      }
      if (
        !lifecycleIsCompatible(
          note.lifecycle,
          adaptation.lifecycle,
          adaptationLifecycleCompatibility,
        )
      ) {
        issues.push(
          `${note.id} lifecycle ${note.lifecycle} is incompatible with ${adaptation.id} lifecycle ${adaptation.lifecycle}.`,
        );
      }
      if (declaredPlatforms.has(adaptation.platform)) {
        issues.push(`${note.id} declares more than one ${adaptation.platform} adaptation.`);
      }
      declaredPlatforms.add(adaptation.platform);
      for (const frame of adaptation.frames) {
        if (frame.diagramId && frame.diagramId !== note.diagramId) {
          issues.push(`${adaptation.id} frame ${frame.index} references an undeclared diagram.`);
        }
      }
    }

    const relationIds = [
      ...note.relations.prerequisites,
      ...note.relations.related,
      ...(note.relations.next ? [note.relations.next] : []),
    ];
    for (const relationId of relationIds) {
      if (!fieldNotes.has(relationId)) {
        issues.push(`${note.id} references missing related Field Note ${relationId}.`);
      }
    }
  }

  for (const pack of input.evidencePacks) {
    if (!fieldNotes.has(pack.fieldNoteId)) issues.push(`${pack.id} has no Field Note.`);
  }
  for (const diagram of input.threadDiagrams) {
    if (!fieldNotes.has(diagram.fieldNoteId)) issues.push(`${diagram.id} has no Field Note.`);
  }
  for (const adaptation of input.adaptations) {
    const note = fieldNotes.get(adaptation.fieldNoteId);
    if (!note) issues.push(`${adaptation.id} has no Field Note.`);
    else if (!note.adaptationIds.includes(adaptation.id)) {
      issues.push(`${adaptation.id} is not declared by ${note.id}.`);
    }
  }
  for (const interview of input.interviews) {
    if (!fieldNotes.has(interview.fieldNoteId)) issues.push(`${interview.id} has no Field Note.`);
  }

  if (issues.length > 0) throw new PublicationGraphError(issues);

  return {
    ...input,
    byId: { fieldNotes, evidencePacks, threadDiagrams, adaptations, interviews },
  };
}
