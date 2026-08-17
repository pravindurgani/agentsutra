import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { buildThreadLayout, routeCrossesNode } from '../../src/components/thread-engine';
import { threadDiagramSchema, threadLayouts, type ThreadDiagram } from '../../src/schemas';
import { loadPublicationGraphFromDisk } from '../../src/lib/publication-graph-files';

const projectRoot = fileURLToPath(new URL('../../', import.meta.url));

async function fixture(): Promise<ThreadDiagram> {
  const graph = await loadPublicationGraphFromDisk({ root: projectRoot, includeFixtures: true });
  const diagram = graph.threadDiagrams.at(0);
  if (!diagram) throw new Error('TD-FN-000 fixture is missing.');
  return diagram;
}

function boxesOverlap(
  left: ReturnType<typeof buildThreadLayout>['nodes'][number],
  right: ReturnType<typeof buildThreadLayout>['nodes'][number],
): boolean {
  return (
    Math.abs(left.x - right.x) < (left.width + right.width) / 2 &&
    Math.abs(left.y - right.y) < (left.height + right.height) / 2
  );
}

describe('Thread Engine V2 schema', () => {
  it('accepts every controlled layout and preserves deterministic geometry', async () => {
    const source = await fixture();
    for (const layout of threadLayouts) {
      const candidate = { ...structuredClone(source), layout };
      const parsed = threadDiagramSchema.parse(candidate);
      const first = buildThreadLayout(parsed);
      const second = buildThreadLayout(parsed);
      expect(second, layout).toEqual(first);
      for (let left = 0; left < first.nodes.length; left += 1) {
        for (let right = left + 1; right < first.nodes.length; right += 1) {
          expect(
            boxesOverlap(first.nodes[left]!, first.nodes[right]!),
            `${layout}: overlapping nodes`,
          ).toBe(false);
        }
      }
      for (const edge of first.edges) {
        for (const node of first.nodes.filter(
          (item) => item.id !== edge.from && item.id !== edge.to,
        )) {
          expect(
            routeCrossesNode(edge.points, node),
            `${layout}: ${edge.id} crosses ${node.id}`,
          ).toBe(false);
        }
      }
    }
  });

  it('supports complete normalized coordinates and rejects a partial coordinate set', async () => {
    const source = await fixture();
    const positioned = {
      ...structuredClone(source),
      nodes: source.nodes.map((node, index) => ({
        ...node,
        position: { x: index / (source.nodes.length - 1), y: index % 2 === 0 ? 0.25 : 0.75 },
      })),
    };
    expect(threadDiagramSchema.safeParse(positioned).success).toBe(true);

    const partial = structuredClone(positioned);
    delete (partial.nodes[0] as { position?: { x: number; y: number } }).position;
    const result = threadDiagramSchema.safeParse(partial);
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues.map((issue) => issue.message).join(' ')).toContain('every node');
  });

  it('rejects visible text that omits any material node or edge', async () => {
    const source = await fixture();
    const missingNode = structuredClone(source);
    missingNode.textSteps = missingNode.textSteps.map((step) => ({
      ...step,
      nodeIds: step.nodeIds.filter((nodeId) => nodeId !== 'N08'),
    }));
    const nodeResult = threadDiagramSchema.safeParse(missingNode);
    expect(nodeResult.success).toBe(false);
    if (!nodeResult.success)
      expect(nodeResult.error.issues.map((issue) => issue.message).join(' ')).toContain('N08');

    const missingEdge = structuredClone(source);
    missingEdge.textSteps = missingEdge.textSteps.map((step) => ({
      ...step,
      edgeIds: step.edgeIds.filter((edgeId) => edgeId !== 'E08'),
    }));
    const edgeResult = threadDiagramSchema.safeParse(missingEdge);
    expect(edgeResult.success).toBe(false);
    if (!edgeResult.success)
      expect(edgeResult.error.issues.map((issue) => issue.message).join(' ')).toContain('E08');
  });

  it('rejects unknown semantic references and unlabeled decision branches', async () => {
    const unknown = structuredClone(await fixture());
    unknown.textSteps[0]!.nodeIds = ['N99'];
    const unknownResult = threadDiagramSchema.safeParse(unknown);
    expect(unknownResult.success).toBe(false);
    if (!unknownResult.success)
      expect(unknownResult.error.issues.map((issue) => issue.message).join(' ')).toContain(
        'unknown node N99',
      );

    const branch = structuredClone(await fixture());
    delete branch.edges.find((edge) => edge.id === 'E07')!.label;
    const branchResult = threadDiagramSchema.safeParse(branch);
    expect(branchResult.success).toBe(false);
    if (!branchResult.success)
      expect(branchResult.error.issues.map((issue) => issue.message).join(' ')).toContain(
        'requires a visible label',
      );
  });

  it('enforces topology required by fork, compare, loop, and feedback layouts', async () => {
    const source = await fixture();
    const withoutIteration = {
      ...structuredClone(source),
      layout: 'feedback',
      edges: source.edges.filter((edge) => edge.kind !== 'iteration'),
      textSteps: source.textSteps.map((step) => ({
        ...step,
        edgeIds: step.edgeIds.filter((edgeId) => edgeId !== 'E06'),
      })),
    };
    const feedbackResult = threadDiagramSchema.safeParse(withoutIteration);
    expect(feedbackResult.success).toBe(false);
    if (!feedbackResult.success)
      expect(feedbackResult.error.issues.map((issue) => issue.message).join(' ')).toContain(
        'requires an iteration edge',
      );

    const withoutBranch = {
      ...structuredClone(source),
      layout: 'fork',
      edges: source.edges.filter((edge) => edge.id !== 'E07'),
      textSteps: source.textSteps.map((step) => ({
        ...step,
        edgeIds: step.edgeIds.filter((edgeId) => edgeId !== 'E07'),
      })),
    };
    const forkResult = threadDiagramSchema.safeParse(withoutBranch);
    expect(forkResult.success).toBe(false);
    if (!forkResult.success)
      expect(forkResult.error.issues.map((issue) => issue.message).join(' ')).toContain(
        'requires a material branch',
      );
  });

  it('renders a compact vertical variant without overlap or node-crossing paths', async () => {
    const source = await fixture();
    const compact = buildThreadLayout({ ...source, compact: true });
    expect(compact.width).toBeLessThanOrEqual(320);
    for (let left = 0; left < compact.nodes.length; left += 1) {
      for (let right = left + 1; right < compact.nodes.length; right += 1) {
        expect(boxesOverlap(compact.nodes[left]!, compact.nodes[right]!)).toBe(false);
      }
    }
    for (const edge of compact.edges) {
      for (const node of compact.nodes.filter(
        (item) => item.id !== edge.from && item.id !== edge.to,
      )) {
        expect(routeCrossesNode(edge.points, node), `${edge.id} crosses ${node.id}`).toBe(false);
      }
    }
  });
});
