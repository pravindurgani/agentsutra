const publicOnlyMarker =
  /(?:FN-000|experiment-fn-000|Synthetic specimen|FIELD \/ 00|No public Field Notes yet|Inspect FN-000|first evidence-reviewed Field Notes are in private pilot production|pilot record)/iu;

/** @param {string} html */
export function containsPublicOnlyMarker(html) {
  return publicOnlyMarker.test(html);
}

/**
 * @param {string} html
 * @param {readonly string[]} fieldNoteRoutes
 */
export function linksBuiltFieldNote(html, fieldNoteRoutes) {
  return fieldNoteRoutes.some((route) => html.includes(`href="${route}"`));
}
