import { notFound } from "next/navigation";
import { getSplitContext, getMergeContext } from "@/lib/actions/batch-split";
import { SplitWizard } from "./split-wizard";

type Props = {
  params: Promise<{ batchId: string }>;
};

export default async function SplitPage({ params }: Props) {
  const { batchId } = await params;
  const [context, mergeCandidates] = await Promise.all([
    getSplitContext(batchId),
    getMergeContext(batchId),
  ]);

  if (!context) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:px-6 lg:py-8">
      <SplitWizard context={context} mergeCandidates={mergeCandidates} />
    </div>
  );
}
