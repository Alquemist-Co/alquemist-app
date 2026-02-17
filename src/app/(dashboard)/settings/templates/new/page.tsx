import { getTemplateFormData } from "@/lib/actions/templates";
import { TemplateEditor } from "../template-editor";

export default async function NewTemplatePage() {
  const formData = await getTemplateFormData();

  return <TemplateEditor formData={formData} />;
}
