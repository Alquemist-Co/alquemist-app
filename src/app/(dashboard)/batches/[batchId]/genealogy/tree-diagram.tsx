"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import type { GenealogyTree, GenealogyNode } from "@/lib/actions/batch-genealogy";

type Props = {
  tree: GenealogyTree;
};

const NODE_WIDTH = 160;
const NODE_HEIGHT = 64;
const H_GAP = 24;
const V_GAP = 48;

type LayoutNode = GenealogyNode & { x: number; y: number; children: LayoutNode[] };

function buildLayout(nodes: GenealogyNode[]): LayoutNode[] {
  // Build tree structure
  const map = new Map<string, LayoutNode>();
  const roots: LayoutNode[] = [];

  for (const node of nodes) {
    map.set(node.id, { ...node, x: 0, y: 0, children: [] });
  }

  for (const node of nodes) {
    const layoutNode = map.get(node.id)!;
    if (node.parentBatchId && map.has(node.parentBatchId)) {
      map.get(node.parentBatchId)!.children.push(layoutNode);
    } else {
      roots.push(layoutNode);
    }
  }

  // Assign positions (simple left-to-right, top-to-bottom)
  let xOffset = 0;

  function layout(node: LayoutNode, depth: number) {
    node.y = depth * (NODE_HEIGHT + V_GAP);

    if (node.children.length === 0) {
      node.x = xOffset;
      xOffset += NODE_WIDTH + H_GAP;
    } else {
      for (const child of node.children) {
        layout(child, depth + 1);
      }
      // Center parent over children
      const first = node.children[0].x;
      const last = node.children[node.children.length - 1].x;
      node.x = (first + last) / 2;
    }
  }

  for (const root of roots) {
    layout(root, 0);
  }

  return roots;
}

function flattenTree(roots: LayoutNode[]): LayoutNode[] {
  const all: LayoutNode[] = [];
  function visit(node: LayoutNode) {
    all.push(node);
    for (const child of node.children) visit(child);
  }
  for (const root of roots) visit(root);
  return all;
}

const STATUS_COLORS: Record<string, string> = {
  active: "stroke-success",
  completed: "stroke-brand",
  cancelled: "stroke-error",
  on_hold: "stroke-warning",
  phase_transition: "stroke-warning",
};

export function TreeDiagram({ tree }: Props) {
  const router = useRouter();
  const roots = buildLayout(tree.nodes);
  const allNodes = flattenTree(roots);

  if (allNodes.length <= 1) {
    return (
      <div className="rounded-lg border border-border p-6 text-center">
        <p className="text-sm text-text-secondary">
          Este batch no tiene linaje (no ha sido dividido ni fusionado).
        </p>
      </div>
    );
  }

  const maxX = Math.max(...allNodes.map((n) => n.x)) + NODE_WIDTH + 20;
  const maxY = Math.max(...allNodes.map((n) => n.y)) + NODE_HEIGHT + 20;

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface-card p-4">
      <svg width={maxX} height={maxY} className="min-w-full">
        {/* Edges */}
        {allNodes.map((node) =>
          node.children.map((child) => (
            <path
              key={`${node.id}-${child.id}`}
              d={`M${node.x + NODE_WIDTH / 2},${node.y + NODE_HEIGHT}
                  C${node.x + NODE_WIDTH / 2},${node.y + NODE_HEIGHT + V_GAP / 2}
                   ${child.x + NODE_WIDTH / 2},${child.y - V_GAP / 2}
                   ${child.x + NODE_WIDTH / 2},${child.y}`}
              fill="none"
              stroke="var(--color-border)"
              strokeWidth={2}
            />
          )),
        )}

        {/* Nodes */}
        {allNodes.map((node) => {
          const isCurrent = node.id === tree.currentBatchId;

          return (
            <g
              key={node.id}
              onClick={() => router.push(`/batches/${node.id}`)}
              className="cursor-pointer"
            >
              <rect
                x={node.x}
                y={node.y}
                width={NODE_WIDTH}
                height={NODE_HEIGHT}
                rx={8}
                fill={isCurrent ? "var(--color-brand-light)" : "var(--color-surface)"}
                stroke={isCurrent ? "var(--color-brand)" : "var(--color-border)"}
                strokeWidth={isCurrent ? 2 : 1}
              />
              <text
                x={node.x + NODE_WIDTH / 2}
                y={node.y + 22}
                textAnchor="middle"
                className="text-xs font-bold"
                fill="var(--color-text-primary)"
                fontFamily="DM Mono, monospace"
                fontSize={11}
              >
                {node.code}
              </text>
              <text
                x={node.x + NODE_WIDTH / 2}
                y={node.y + 38}
                textAnchor="middle"
                fontSize={10}
                fill="var(--color-text-secondary)"
              >
                {node.plantCount} plantas
              </text>
              <text
                x={node.x + NODE_WIDTH / 2}
                y={node.y + 52}
                textAnchor="middle"
                fontSize={9}
                fill={node.status === "active" ? "var(--color-success)" : "var(--color-text-secondary)"}
              >
                {node.status === "active" ? node.currentPhaseName : node.status}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
