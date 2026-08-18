import { describe, expect, it } from 'vitest';

import { scanPrivateMaterial } from '../../scripts/lib/privacy-rules.mjs';

describe('privacy scan rules', () => {
  it('detects private paths, infrastructure, project identities, and credential shapes', () => {
    const sample = [
      ['/Users', '/example', '/private/report.json'].join(''),
      ['192', '.168', '.2', '.44'].join(''),
      ['Role', 'Demand'].join(''),
      ['sk-ant-', 'abcdefghijklmnopqrstuvwxyz1234567890'].join(''),
    ].join('\n');

    expect(scanPrivateMaterial(sample).map((finding) => finding.name)).toEqual([
      'macOS user path',
      'private IPv4 address',
      'known private project identity',
      'credential-shaped value',
    ]);
  });

  it('does not reject normal public publication text', () => {
    expect(
      scanPrivateMaterial(
        'AgentSutra links to https://agentsutra.dev/field-notes/example/ and includes an explicit evidence boundary.',
      ),
    ).toEqual([]);
  });
});
