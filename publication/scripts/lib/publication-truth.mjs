/**
 * Preserve the exact ordered characters of a publication claim while ignoring
 * whitespace inserted by PDF layout and extraction engines.
 *
 * @param {unknown} value
 */
export function comparablePublicationText(value) {
  return String(value).normalize('NFKC').replace(/\s+/gu, '');
}

/**
 * @param {unknown} source
 * @param {unknown} expected
 */
export function containsPublicationTruth(source, expected) {
  const comparableExpected = comparablePublicationText(expected);
  return (
    comparableExpected.length > 0 && comparablePublicationText(source).includes(comparableExpected)
  );
}
