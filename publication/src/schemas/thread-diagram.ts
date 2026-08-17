import { z } from 'astro/zod';

import {
  fieldNoteIdSchema,
  nonEmptyTextSchema,
  schemaVersionSchema,
  sentenceSchema,
  threadDiagramIdSchema,
} from './shared';

export const threadNodeSemantics = {
  input: '□',
  state: '□',
  artifact: '□',
  decision: '◇',
  process: '○',
  verified: '✓',
  failure: '×',
  uncertainty: '···',
} as const;

export const threadEdgeSemantics = {
  deterministic: '→',
  iteration: '↻',
  unresolved: '···',
} as const;

export const threadLayouts = [
  'linear',
  'vertical',
  'fork',
  'loop',
  'compare',
  'stack',
  'feedback',
] as const;

export const threadLayoutSchema = z.enum(threadLayouts);

const nodeIdSchema = z.string().regex(/^N\d{2}$/);
const edgeIdSchema = z.string().regex(/^E\d{2}$/);
const stepIdSchema = z.string().regex(/^T\d{2}$/);
const nodeKindSchema = z.enum(
  Object.keys(threadNodeSemantics) as [
    keyof typeof threadNodeSemantics,
    ...(keyof typeof threadNodeSemantics)[],
  ],
);
const edgeKindSchema = z.enum(
  Object.keys(threadEdgeSemantics) as [
    keyof typeof threadEdgeSemantics,
    ...(keyof typeof threadEdgeSemantics)[],
  ],
);

const positionSchema = z
  .object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
  })
  .strict();

export const threadDiagramSchema = z
  .object({
    schemaVersion: schemaVersionSchema,
    id: threadDiagramIdSchema,
    fieldNoteId: fieldNoteIdSchema,
    title: nonEmptyTextSchema.max(180),
    description: sentenceSchema,
    layout: threadLayoutSchema,
    nodes: z
      .array(
        z
          .object({
            id: nodeIdSchema,
            kind: nodeKindSchema,
            stage: z.enum(['intent', 'reasoning', 'outcome']),
            label: nonEmptyTextSchema.max(80),
            position: positionSchema.optional(),
          })
          .strict(),
      )
      .min(2)
      .max(12),
    edges: z
      .array(
        z
          .object({
            id: edgeIdSchema,
            from: nodeIdSchema,
            to: nodeIdSchema,
            kind: edgeKindSchema,
            label: nonEmptyTextSchema.max(80).optional(),
          })
          .strict(),
      )
      .min(1)
      .max(16),
    textSteps: z
      .array(
        z
          .object({
            id: stepIdSchema,
            summary: sentenceSchema,
            nodeIds: z.array(nodeIdSchema).min(1).max(12),
            edgeIds: z.array(edgeIdSchema).max(16),
          })
          .strict(),
      )
      .min(2)
      .max(16),
  })
  .strict()
  .superRefine((diagram, context) => {
    const nodeIds = new Set<string>();
    for (const [index, node] of diagram.nodes.entries()) {
      if (nodeIds.has(node.id)) {
        context.addIssue({
          code: 'custom',
          path: ['nodes', index, 'id'],
          message: `Duplicate Thread node ID: ${node.id}.`,
        });
      }
      nodeIds.add(node.id);
    }

    const positioned = diagram.nodes.filter((node) => node.position).length;
    if (positioned > 0 && positioned !== diagram.nodes.length) {
      context.addIssue({
        code: 'custom',
        path: ['nodes'],
        message: 'Normalized positions must be supplied for every node or for none of them.',
      });
    }

    const edgeIds = new Set<string>();
    const outgoing = new Map<string, typeof diagram.edges>();
    for (const [index, edge] of diagram.edges.entries()) {
      if (edgeIds.has(edge.id)) {
        context.addIssue({
          code: 'custom',
          path: ['edges', index, 'id'],
          message: `Duplicate Thread edge ID: ${edge.id}.`,
        });
      }
      edgeIds.add(edge.id);
      if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
        context.addIssue({
          code: 'custom',
          path: ['edges', index],
          message: `Thread edge ${edge.id} (${edge.from} → ${edge.to}) references an unknown node.`,
        });
      }
      if (edge.from === edge.to) {
        context.addIssue({
          code: 'custom',
          path: ['edges', index],
          message: 'A Thread edge cannot connect a node to itself.',
        });
      }
      const branch = outgoing.get(edge.from) ?? [];
      branch.push(edge);
      outgoing.set(edge.from, branch);
    }

    const stepIds = new Set<string>();
    const coveredNodes = new Set<string>();
    const coveredEdges = new Set<string>();
    for (const [index, step] of diagram.textSteps.entries()) {
      if (stepIds.has(step.id)) {
        context.addIssue({
          code: 'custom',
          path: ['textSteps', index, 'id'],
          message: `Duplicate Thread text-step ID: ${step.id}.`,
        });
      }
      stepIds.add(step.id);
      for (const nodeId of step.nodeIds) {
        if (!nodeIds.has(nodeId)) {
          context.addIssue({
            code: 'custom',
            path: ['textSteps', index, 'nodeIds'],
            message: `Text step ${step.id} references unknown node ${nodeId}.`,
          });
        }
        coveredNodes.add(nodeId);
      }
      for (const edgeId of step.edgeIds) {
        if (!edgeIds.has(edgeId)) {
          context.addIssue({
            code: 'custom',
            path: ['textSteps', index, 'edgeIds'],
            message: `Text step ${step.id} references unknown edge ${edgeId}.`,
          });
        }
        coveredEdges.add(edgeId);
      }
    }

    const missingNodes = diagram.nodes.filter((node) => !coveredNodes.has(node.id));
    if (missingNodes.length > 0) {
      context.addIssue({
        code: 'custom',
        path: ['textSteps'],
        message: `Visible text steps do not cover nodes: ${missingNodes.map((node) => node.id).join(', ')}.`,
      });
    }
    const missingEdges = diagram.edges.filter((edge) => !coveredEdges.has(edge.id));
    if (missingEdges.length > 0) {
      context.addIssue({
        code: 'custom',
        path: ['textSteps'],
        message: `Visible text steps do not cover edges: ${missingEdges.map((edge) => edge.id).join(', ')}.`,
      });
    }

    const intentNodes = diagram.nodes.filter((node) => node.stage === 'intent');
    const outcomeNodes = diagram.nodes.filter((node) => node.stage === 'outcome');
    if (intentNodes.length === 0) {
      context.addIssue({
        code: 'custom',
        path: ['nodes'],
        message: 'A Thread requires at least one intent node.',
      });
    }
    if (outcomeNodes.length === 0) {
      context.addIssue({
        code: 'custom',
        path: ['nodes'],
        message: 'A Thread requires at least one outcome node.',
      });
    }

    const reachable = new Set(intentNodes.map((node) => node.id));
    let changed = true;
    while (changed) {
      changed = false;
      for (const edge of diagram.edges) {
        if (reachable.has(edge.from) && !reachable.has(edge.to)) {
          reachable.add(edge.to);
          changed = true;
        }
      }
    }
    const unreachable = diagram.nodes.filter((node) => !reachable.has(node.id));
    if (unreachable.length > 0) {
      context.addIssue({
        code: 'custom',
        path: ['nodes'],
        message: `Every material Thread node must be reachable from intent: ${unreachable.map((node) => node.id).join(', ')}.`,
      });
    }

    for (const node of diagram.nodes.filter((item) => item.kind === 'decision')) {
      const branches = outgoing.get(node.id) ?? [];
      if (branches.length > 1 && branches.some((edge) => !edge.label)) {
        context.addIssue({
          code: 'custom',
          path: ['edges'],
          message: `Every branch leaving decision ${node.id} requires a visible label.`,
        });
      }
    }

    const hasBranch = [...outgoing.values()].some((edges) => edges.length > 1);
    const hasIteration = diagram.edges.some((edge) => edge.kind === 'iteration');
    if ((diagram.layout === 'fork' || diagram.layout === 'compare') && !hasBranch) {
      context.addIssue({
        code: 'custom',
        path: ['layout'],
        message: `The ${diagram.layout} layout requires a material branch.`,
      });
    }
    if (diagram.layout === 'compare' && outcomeNodes.length < 2) {
      context.addIssue({
        code: 'custom',
        path: ['layout'],
        message: 'The compare layout requires at least two outcomes.',
      });
    }
    if ((diagram.layout === 'loop' || diagram.layout === 'feedback') && !hasIteration) {
      context.addIssue({
        code: 'custom',
        path: ['layout'],
        message: `The ${diagram.layout} layout requires an iteration edge.`,
      });
    }
  });

export type ThreadDiagram = z.infer<typeof threadDiagramSchema>;
export type ThreadLayout = z.infer<typeof threadLayoutSchema>;
export type ThreadNode = ThreadDiagram['nodes'][number];
export type ThreadEdge = ThreadDiagram['edges'][number];
export type ThreadTextStep = ThreadDiagram['textSteps'][number];
