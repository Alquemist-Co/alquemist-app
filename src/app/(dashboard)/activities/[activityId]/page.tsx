import { getActivityContext } from "@/lib/actions/execute-activity";
import { ExecuteActivityView } from "./execute-activity-view";
import { EmptyState } from "@/components/shared/empty-state";
import { AlertTriangle } from "lucide-react";

type Props = {
  params: Promise<{ activityId: string }>;
};

export default async function ActivityDetailPage({ params }: Props) {
  const { activityId } = await params;
  const result = await getActivityContext(activityId);

  if (!result.success) {
    return (
      <div className="flex flex-1 items-center justify-center p-4 lg:p-6">
        <EmptyState
          icon={AlertTriangle}
          title="Error"
          description={result.error}
          action={{ label: "Volver a actividades", href: "/activities" }}
        />
      </div>
    );
  }

  return <ExecuteActivityView context={result.data} />;
}
