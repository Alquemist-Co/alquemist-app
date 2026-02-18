import { getUserById } from "@/lib/actions/users";
import { getFacilities } from "@/lib/actions/areas";
import { notFound } from "next/navigation";
import { EditUserForm } from "./edit-user-form";

export default async function EditUserPage(props: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await props.params;
  const [user, facilities] = await Promise.all([
    getUserById(userId),
    getFacilities(),
  ]);

  if (!user) notFound();

  return (
    <div className="p-4 lg:p-6">
      <div className="mx-auto max-w-2xl">
        <EditUserForm user={user} facilities={facilities} />
      </div>
    </div>
  );
}
