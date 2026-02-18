import {
  getRecentObservations,
  getObservationFormData,
} from "@/lib/actions/observations";
import { ObservationsView } from "./observations-view";

export default async function ObservationsPage() {
  const [observations, formData] = await Promise.all([
    getRecentObservations(),
    getObservationFormData(),
  ]);

  return (
    <ObservationsView
      observations={observations}
      batches={formData.batches}
    />
  );
}
