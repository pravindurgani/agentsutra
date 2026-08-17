import type { FieldNote } from '../schemas';

export function selectVisibleRelatedNotes(
  allNotes: readonly FieldNote[],
  visibleNotes: readonly FieldNote[],
  relatedIds: readonly string[],
): FieldNote[] {
  const visibleIds = new Set(visibleNotes.map((note) => note.id));
  const relatedIdSet = new Set(relatedIds);

  return allNotes.filter((note) => visibleIds.has(note.id) && relatedIdSet.has(note.id));
}
