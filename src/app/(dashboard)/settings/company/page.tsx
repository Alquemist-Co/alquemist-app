import { getCompany } from "@/lib/actions/company";
import { notFound } from "next/navigation";
import { CompanyForm } from "./company-form";

export default async function CompanyPage() {
  const company = await getCompany();
  if (!company) notFound();
  return <CompanyForm company={company} />;
}
