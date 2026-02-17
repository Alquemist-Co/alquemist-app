import { getTemplates, getTemplateFormData } from "@/lib/actions/templates";
import { TemplateList } from "./template-list";

export default async function TemplatesPage() {
  const [templates, formData] = await Promise.all([
    getTemplates(),
    getTemplateFormData(),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      <TemplateList
        templates={templates}
        activityTypes={formData.activityTypes}
        phases={formData.phases}
      />
    </div>
  );
}
