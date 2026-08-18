import type { EvidencePack } from '../schemas';

export interface PublicEvidencePresentation {
  statusLabel:
    'TEST FIXTURE' | 'OBSERVED' | 'REPRODUCED' | 'MEASURED' | 'BOUNDED' | 'CORRECTED' | 'WITHDRAWN';
  boundary: string;
  correctionLabel: string;
  lifecycle: EvidencePack['lifecycle'];
  synthetic: boolean;
}

export const publicEvidenceMeanings: Record<PublicEvidencePresentation['statusLabel'], string> = {
  'TEST FIXTURE': 'Engineering test data; not a public lesson or real-world claim.',
  OBSERVED: 'Seen in one stated setting; it may not generalise.',
  REPRODUCED: 'Repeated under the stated conditions.',
  MEASURED: 'Counted using the stated setup and denominator.',
  BOUNDED: 'Useful only within the stated limits.',
  CORRECTED: 'The published claim or evidence materially changed.',
  WITHDRAWN: 'The claim is no longer supported.',
};

export function getPublicEvidencePresentation(pack: EvidencePack): PublicEvidencePresentation {
  const synthetic = pack.privacy.classification === 'synthetic';
  let statusLabel: PublicEvidencePresentation['statusLabel'] = 'BOUNDED';

  if (synthetic) statusLabel = 'TEST FIXTURE';
  else if (pack.correctionStatus === 'withdrawn' || pack.lifecycle === 'withdrawn') {
    statusLabel = 'WITHDRAWN';
  } else if (pack.correctionStatus === 'corrected' || pack.lifecycle === 'corrected') {
    statusLabel = 'CORRECTED';
  } else if (pack.measurement) statusLabel = 'MEASURED';
  else if (pack.evidence.some((item) => item.verification === 'reproduced')) {
    statusLabel = 'REPRODUCED';
  } else if (pack.evidence.some((item) => item.kind === 'observation')) {
    statusLabel = 'OBSERVED';
  }

  const correctionLabel =
    pack.correctionStatus === 'open'
      ? 'Correction open'
      : pack.correctionStatus === 'corrected'
        ? 'Corrected record'
        : pack.correctionStatus === 'withdrawn'
          ? 'Withdrawn record'
          : pack.lifecycle === 'draft'
            ? 'Draft — not published'
            : 'No open correction';

  return {
    statusLabel,
    boundary: pack.boundary.statement,
    correctionLabel,
    lifecycle: pack.lifecycle,
    synthetic,
  };
}
