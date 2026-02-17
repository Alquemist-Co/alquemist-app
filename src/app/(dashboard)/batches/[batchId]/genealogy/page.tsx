import { notFound } from "next/navigation";
import { getGenealogyTree, getLineageOperations } from "@/lib/actions/batch-genealogy";
import { GenealogyView } from "./genealogy-view";

type Props = {
  params: Promise<{ batchId: string }>;
};

export default async function GenealogyPage({ params }: Props) {
  const { batchId } = await params;
  const [tree, operations] = await Promise.all([
    getGenealogyTree(batchId),
    getLineageOperations(batchId),
  ]);

  if (tree.nodes.length === 0) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 lg:px-6 lg:py-8">
      <GenealogyView tree={tree} operations={operations} />
    </div>
  );
}
