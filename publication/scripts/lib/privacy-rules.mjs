const privateNetworkName = ['tail', 'net'].join('');
const doNotPublishMarker = ['DO NOT', 'PUBLISH'].join(' ');
const beginPrivateMarker = ['BEGIN', 'PRIVATE'].join(' ');

/** @type {Array<readonly [string, RegExp]>} */
export const privacyRules = [
  ['macOS user path', /\/Users\/[A-Za-z0-9._-]+\//giu],
  ['Linux user path', /\/home\/[A-Za-z0-9._-]+\//giu],
  ['Windows user path', /[A-Z]:\\Users\\[^\\\s]+\\/giu],
  [
    'private IPv4 address',
    /\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b/gu,
  ],
  ['Tailscale address', /\b100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d{1,3}\.\d{1,3}\b/gu],
  [
    'private hostname',
    new RegExp(
      `\\b(?:[A-Za-z0-9-]+\\.(?:local|lan|internal|ts\\.net)|${privateNetworkName}|agentsutra-(?:m|node|mini)\\d*)\\b`,
      'giu',
    ),
  ],
  ['local service URL', /https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?/giu],
  [
    'private content marker',
    new RegExp(
      `(?:\\[(?:PRIVATE|CONFIDENTIAL|INTERNAL ONLY)\\]|${beginPrivateMarker}|${doNotPublishMarker})`,
      'giu',
    ),
  ],
  [
    'structured client identity',
    /^\s*(?:client|clientName|customer|customerName)\s*[:=]\s*\S+/gimu,
  ],
  ['known private project identity', new RegExp(`\\b${['Role', 'Demand'].join('')}\\b`, 'giu')],
  ['private key material', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/gu],
  [
    'credential-shaped value',
    /\b(?:sk-ant-[A-Za-z0-9_-]{20,}|sk-proj-[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{30,}|AKIA[A-Z0-9]{16})\b/gu,
  ],
  [
    'credential assignment',
    /\b(?:api[_-]?key|secret|password|token)\s*[:=]\s*["'][^"'\s]{12,}["']/giu,
  ],
];

/** @param {string} text @param {number} index */
function locationFor(text, index) {
  const prefix = text.slice(0, index);
  const line = prefix.split('\n').length;
  const lastBreak = prefix.lastIndexOf('\n');
  return { line, column: index - lastBreak };
}

/** @param {string} text */
export function scanPrivateMaterial(text) {
  const findings = [];
  for (const [name, pattern] of privacyRules) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      findings.push({ name, ...locationFor(text, match.index ?? 0) });
    }
  }
  return findings;
}
