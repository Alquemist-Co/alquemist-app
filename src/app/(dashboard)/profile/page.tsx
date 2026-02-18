import { getProfile } from "@/lib/actions/profile";
import { notFound } from "next/navigation";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const profile = await getProfile();
  if (!profile) notFound();
  return <ProfileForm profile={profile} />;
}
