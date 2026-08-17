export const publicationProfiles = {
  prelaunch: {
    environment: {
      PUBLICATION_PROFILE: 'prelaunch',
      PUBLIC_LAUNCH: '0',
      INCLUDE_FIXTURES: '0',
      EXPORT_MODE: '0',
    },
    robots: `User-agent: *
Disallow: /
`,
  },
  public: {
    environment: {
      PUBLICATION_PROFILE: 'public',
      PUBLIC_LAUNCH: '1',
      INCLUDE_FIXTURES: '0',
      EXPORT_MODE: '0',
    },
    robots: `User-agent: *
Allow: /

Sitemap: https://agentsutra.dev/sitemap-index.xml
`,
  },
};

const sharedHeaders = [
  '/*',
  "  Content-Security-Policy: default-src 'none'; base-uri 'none'; connect-src 'self'; font-src 'self'; form-action 'none'; frame-ancestors 'none'; img-src 'self' data:; manifest-src 'self'; media-src 'self'; object-src 'none'; script-src 'none'; style-src 'self'; worker-src 'none'; upgrade-insecure-requests",
  '  Cross-Origin-Opener-Policy: same-origin',
  '  Cross-Origin-Resource-Policy: same-origin',
  '  Permissions-Policy: accelerometer=(), ambient-light-sensor=(), autoplay=(), camera=(), display-capture=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), publickey-credentials-get=(), screen-wake-lock=(), usb=()',
  '  Referrer-Policy: strict-origin-when-cross-origin',
  '  X-Content-Type-Options: nosniff',
  '  X-Frame-Options: DENY',
];

const cacheHeaders = [
  '',
  '/_astro/*',
  '  Cache-Control: public, max-age=31536000, immutable',
  '',
  '/favicon.svg',
  '  Cache-Control: public, max-age=86400',
  '',
  '/favicon.ico',
  '  Cache-Control: public, max-age=86400',
  '',
];

/** @param {unknown} profile */
export function assertPublicationProfile(profile) {
  if (typeof profile !== 'string' || !(profile in publicationProfiles)) {
    throw new Error(`Unknown publication profile: ${String(profile)}.`);
  }
  return /** @type {keyof typeof publicationProfiles} */ (profile);
}

/** @param {unknown} profile */
export function headersForProfile(profile) {
  const safeProfile = assertPublicationProfile(profile);
  const lines = [...sharedHeaders];
  if (safeProfile === 'prelaunch') {
    lines.push('  X-Robots-Tag: noindex, nofollow, noarchive, nosnippet');
  }
  return [...lines, ...cacheHeaders].join('\n');
}
