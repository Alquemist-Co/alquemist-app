import { notFound } from "next/navigation";
import { getTemplate, getTemplateFormData } from "@/lib/actions/templates";
import { TemplateEditor } from "../template-editor";

type Props = {
  params: Promise<{ templateId: string }>;
};

export default async function TemplateDetailPage({ params }: Props) {
  const { templateId } = await params;
  const [template, formData] = await Promise.all([
    getTemplate(templateId),
    getTemplateFormData(),
  ]);

  if (!template) {
    notFound();
  }

  return <TemplateEditor template={template} formData={formData} />;
}
