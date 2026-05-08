import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Especialidades() {
  const [nome, setNome] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");
  const qc = useQueryClient();

  const { data: especialidades = [], isLoading } = useQuery({
    queryKey: ["especialidades"],
    queryFn: async () => {
      const { data, error } = await supabase.from("especialidades").select("*").order("nome");
      if (error) throw error;
      return data as any[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!nome.trim()) throw new Error("Preencha o nome");
      const { error } = await supabase.from("especialidades").insert({ nome: nome.trim() });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["especialidades"] }); setNome(""); toast.success("Especialidade criada!"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("especialidades").update({ nome: editNome.trim() }).eq("id", editingId!);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["especialidades"] }); setEditingId(null); toast.success("Atualizada!"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("especialidades").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["especialidades"] }); toast.success("Excluída!"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <h1 className="page-title">Especialidades</h1>

      <div className="flex gap-2">
        <input value={nome} onChange={e => setNome(e.target.value)}
          placeholder="Nova especialidade..." onKeyDown={e => e.key === "Enter" && create.mutate()}
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
        <button onClick={() => create.mutate()} disabled={!nome.trim() || create.isPending}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          <Plus className="h-4 w-4" />Adicionar
        </button>
      </div>

      {isLoading ? <p className="text-muted-foreground text-sm">Carregando...</p> : (
        <div className="space-y-2">
          {especialidades.map(esp => (
            <div key={esp.id} className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
              {editingId === esp.id ? (
                <input value={editNome} onChange={e => setEditNome(e.target.value)} autoFocus
                  className="flex-1 rounded border px-2 py-1 text-sm mr-2 outline-none focus:ring-2 focus:ring-ring" />
              ) : (
                <span className="text-sm font-medium">{esp.nome}</span>
              )}
              <div className="flex gap-1">
                {editingId === esp.id ? (
                  <>
                    <button onClick={() => update.mutate()} className="rounded px-2 py-1 text-xs bg-primary text-primary-foreground hover:bg-primary/90">Salvar</button>
                    <button onClick={() => setEditingId(null)} className="rounded px-2 py-1 text-xs border hover:bg-muted">Cancelar</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { setEditingId(esp.id); setEditNome(esp.nome); }} className="p-1.5 rounded hover:bg-muted"><Pencil className="h-4 w-4 text-muted-foreground" /></button>
                    <button onClick={() => { if (confirm("Excluir?")) remove.mutate(esp.id); }} className="p-1.5 rounded hover:bg-muted"><Trash2 className="h-4 w-4 text-destructive" /></button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}