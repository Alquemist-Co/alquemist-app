import { notFound } from "next/navigation";
import { getTest } from "@/lib/actions/quality";
import { RecordResults } from "./record-results";

type Props = {
  params: Promise<{ testId: string }>;
};

export default async function TestDetailPage({ params }: Props) {
  const { testId } = await params;
  const test = await getTest(testId);

  if (!test) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 lg:px-6 lg:py-8">
      <RecordResults test={test} />
    </div>
  );
}
