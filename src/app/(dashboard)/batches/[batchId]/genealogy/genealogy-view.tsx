"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, GitBranch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import type { GenealogyTree, LineageOperation } from "@/lib/actions/batch-genealogy";
import { TreeDiagram } from "./tree-diagram";
import { OperationsTable } from "./operations-table";

type Props = {
  tree: GenealogyTree;
  operations: LineageOperation[];
};

type TabKey = "tree" | "table";

export function GenealogyView({ tree, operations }: Props) {
  const [tab, setTab] = useState<TabKey>("tree");

  const currentNode = tree.nodes.find((n) => n.id === tree.currentBatchId);

  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/batches/${tree.currentBatchId}`}>
          <button type="button" className="text-text-secondary hover:text-text-primary">
            <ArrowLeft className="h-5 w-5" />
          </button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-text-primary">Genealogia</h1>
          {currentNode && (
            <p className="text-sm text-text-secondary">
              <span className="font-mono">{currentNode.code}</span>
              {" — "}{tree.nodes.length} nodos
            </p>
          )}
        </div>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setTab("tree")}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            tab === "tree" ? "bg-brand text-white" : "bg-surface-secondary text-text-secondary hover:text-text-primary",
          )}
        >
          <GitBranch className="inline h-3.5 w-3.5 mr-1" />
          Arbol
        </button>
        <button
          type="button"
          onClick={() => setTab("table")}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            tab === "table" ? "bg-brand text-white" : "bg-surface-secondary text-text-secondary hover:text-text-primary",
          )}
        >
          Operaciones
          {operations.length > 0 && (
            <Badge variant="outlined" className="ml-1.5">{operations.length}</Badge>
          )}
        </button>
      </div>

      {tab === "tree" ? (
        <TreeDiagram tree={tree} />
      ) : (
        <OperationsTable operations={operations} />
      )}
    </>
  );
}
