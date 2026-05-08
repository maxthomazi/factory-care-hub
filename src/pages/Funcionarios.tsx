import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

export default function Funcionarios() {
  const qc = useQueryClient();
  const { empresaId } = useAuth();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: "", especialidade_id: "", salario_mensal: "", ativo: true });

  const { data: funcionarios = [], isLoading } = useQuery({
    queryKey: ["funcionarios", empresaId],
    queryFn: async () => {
      const { data, error } = await supabase.from("funcionarios").select("*, especialidades(nome)").order("nome");
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: especialidades = [] } = useQuery({
    queryKey: ["especialidades", empresaId],
    queryFn: async () => {
      const { data } = await supabase.from("especialidades").select("*").order("nome");
      return data as any[] || [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.nome.trim()) throw new Error("Preencha o nome");
      const payload = {
        nome: form.nome.trim(),
        especialidade_id: form.especialidade_id || null,
        salario_mensal: Number(form.salario_mensal) || 0,
        ativo: form.ativo,
        empresa_id: empresaId,
      };
      if (editingId) {
        const { error } = await supabase.from("funcionarios").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("funcionarios").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["funcionarios"] });
      toast.success(editingId ? "Atualizado!" : "Funcionário criado!");
      setOpen(false); setEditingId(null);
      setForm({ nome: "", especialidade_id: "", salario_mensal: "", ativo: true });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("funcionarios").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["funcionarios"] }); toast.success("Excluído!"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const ativos = funcionarios.filter(f => f.ativo);
  const inativos = funcionarios.filter(f => !f.ativo);

  function openCreate() { setEditingId(null); setForm({ nome: "", especialidade_id: "", salario_mensal: "", ativo: true }); setOpen(true); }
  function openEdit(f: any) { setEditingId(f.id); setForm({ nome: f.nome, especialidade_id: f.especialidade_id || "", salario_mensal: String(f.salario_mensal || ""), ativo: f.ativo }); setOpen(true); }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Funcionários</h1>
        <button onClick={openCreate} className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" />Novo Funcionário
        </button>
      </div>

      {isLoading ? <p className="text-muted-foreground text-center py-8">Carregando...</p> : (
        <div className="space-y-6">
          {ativos.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">ATIVOS ({ativos.length})</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {ativos.map(f => (
                  <div key={f.id} className="kpi-card">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-sm">{f.nome}</h3>
                        <p className="text-xs text-muted-foreground">{f.especialidades?.nome || "—"}</p>
                      </div>
                      <span className="flex items-center gap-1 text-xs text-green-600 font-medium"><Users className="h-3 w-3" />Ativo</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Salário: <span className="font-medium text-foreground">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(f.salario_mensal || 0)}</span></p>
                    <p className="text-sm text-muted-foreground">Homem/hora: <span className="font-medium text-foreground">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((f.salario_mensal || 0) / 176)}</span></p>
                    <div className="flex justify-end gap-1 mt-3 pt-3 border-t">
                      <button onClick={() => openEdit(f)} className="p-1.5 rounded hover:bg-muted"><Pencil className="h-4 w-4 text-muted-foreground" /></button>
                      <button onClick={() => { if (confirm("Excluir?")) remove.mutate(f.id); }} className="p-1.5 rounded hover:bg-muted"><Trash2 className="h-4 w-4 text-destructive" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {inativos.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">INATIVOS ({inativos.length})</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {inativos.map(f => (
                  <div key={f.id} className="kpi-card opacity-60">
                    <h3 className="font-semibold text-sm">{f.nome}</h3>
                    <p className="text-xs text-muted-foreground">{f.especialidades?.nome || "—"}</p>
                    <div className="flex justify-end gap-1 mt-3 pt-3 border-t">
                      <button onClick={() => openEdit(f)} className="p-1.5 rounded hover:bg-muted"><Pencil className="h-4 w-4 text-muted-foreground" /></button>
                      <button onClick={() => { if (confirm("Excluir?")) remove.mutate(f.id); }} className="p-1.5 rounded hover:bg-muted"><Trash2 className="h-4 w-4 text-destructive" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {funcionarios.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhum funcionário cadastrado.</p>}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-card border shadow-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold">{editingId ? "Editar Funcionário" : "Novo Funcionário"}</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Nome</label>
                <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-sm font-medium">Especialidade</label>
                <select value={form.especialidade_id} onChange={e => setForm(f => ({ ...f, especialidade_id: e.target.value }))}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring bg-background">
                  <option value="">Selecione...</option>
                  {especialidades.map((e: any) => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Salário mensal (R$)</label>
                <input type="number" value={form.salario_mensal} onChange={e => setForm(f => ({ ...f, salario_mensal: e.target.value }))}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="ativo" checked={form.ativo} onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))} />
                <label htmlFor="ativo" className="text-sm font-medium">Ativo</label>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setOpen(false)} className="rounded-md border px-4 py-2 text-sm hover:bg-muted">Cancelar</button>
              <button onClick={() => save.mutate()} disabled={save.isPending}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                {save.isPending ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
