import type { EvidencePack } from '../schemas';

export interface PublicEvidencePresentation {
  statusLabel: 'TEST FIXTURE' | 'OBSERVED' | 'REPRODUCED' | 'MEASURED' | 'CORRECTED' | 'WITHDRAWN';
  boundary: string;
  correctionLabel: string;
  lifecycle: EvidencePack['lifecycle'];
  synthetic: boolean;
}

export function getPublicEvidencePresentation(pack: EvidencePack): PublicEvidencePresentation {
  const synthetic = pack.privacy.classification === 'synthetic';
  let statusLabel: PublicEvidencePresentation['statusLabel'] = 'OBSERVED';

  if (synthetic) statusLabel = 'TEST FIXTURE';
  else if (pack.correctionStatus === 'withdrawn' || pack.lifecycle === 'withdrawn') {
    statusLabel = 'WITHDRAWN';
  } else if (pack.correctionStatus === 'corrected' || pack.lifecycle === 'corrected') {
    statusLabel = 'CORRECTED';
  } else if (pack.measurement) statusLabel = 'MEASURED';
  else if (pack.evidence.some((item) => item.verification === 'reproduced')) {
    statusLabel = 'REPRODUCED';
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
