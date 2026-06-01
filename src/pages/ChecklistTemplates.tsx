import { ClipboardCheck } from "lucide-react";

export default function ChecklistTemplates() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-muted-foreground space-y-3">
      <ClipboardCheck className="h-12 w-12 opacity-30" />
      <h1 className="text-xl font-semibold text-foreground">Checklists</h1>
      <p className="text-sm">Módulo em desenvolvimento. Em breve disponível.</p>
    </div>
  );
}
