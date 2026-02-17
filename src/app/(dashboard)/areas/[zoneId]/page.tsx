import { notFound } from "next/navigation";
import { getZoneDetail } from "@/lib/actions/areas";
import { ZoneDetailView } from "./zone-detail";

type Props = {
  params: Promise<{ zoneId: string }>;
};

export default async function ZoneDetailPage({ params }: Props) {
  const { zoneId } = await params;
  const zone = await getZoneDetail(zoneId);

  if (!zone) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 lg:px-6 lg:py-8">
      <ZoneDetailView zone={zone} />
    </div>
  );
}
