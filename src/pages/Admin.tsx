import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, Plus, Trash2, Pencil, Users } from "lucide-react";
import { toast } from "sonner";

export default function Admin() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: "", email: "", role: "tecnico" });

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ["usuarios"],
    queryFn: async () => {
      const { data, error } = await supabase.from("usuarios").select("*").order("nome");
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: empresas = [] } = useQuery({
    queryKey: ["empresas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("empresas").select("*").order("nome");
      if (error) throw error;
      return data as any[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.nome.trim()) throw new Error("Preencha o nome");
      const payload = { nome: form.nome.trim(), email: form.email.trim() || null, role: form.role };
      if (editingId) {
        const { error } = await supabase.from("usuarios").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("usuarios").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["usuarios"] });
      toast.success(editingId ? "Atualizado!" : "Usuário criado!");
      setOpen(false); setEditingId(null); setForm({ nome: "", email: "", role: "tecnico" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("usuarios").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["usuarios"] }); toast.success("Excluído!"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const ROLE_CFG: Record<string, { label: string; color: string }> = {
    admin:    { label: "Admin",    color: "bg-purple-100 text-purple-700" },
    gestor:   { label: "Gestor",   color: "bg-blue-100 text-blue-700"    },
    tecnico:  { label: "Técnico",  color: "bg-green-100 text-green-700"  },
    operador: { label: "Operador", color: "bg-slate-100 text-slate-600"  },
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <ShieldCheck className="h-6 w-6" />Administração
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Gerenciamento de usuários e empresas</p>
        </div>
        <button onClick={() => { setEditingId(null); setForm({ nome: "", email: "", role: "tecnico" }); setOpen(true); }}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" />Novo Usuário
        </button>
      </div>

      {/* Empresas */}
      <div className="kpi-card">
        <h3 className="font-semibold mb-3">Empresas cadastradas</h3>
        {empresas.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma empresa.</p> : (
          <div className="space-y-2">
            {empresas.map((e: any) => (
              <div key={e.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium">{e.nome}</p>
                  <p className="text-xs text-muted-foreground">{e.slug} · Plano: {e.plano || "trial"}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${e.ativo ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>
                  {e.ativo ? "Ativo" : "Inativo"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Usuários */}
      <div className="kpi-card">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Users className="h-4 w-4" />Usuários do sistema
        </h3>
        {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> :
          usuarios.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum usuário cadastrado.</p> : (
            <div className="space-y-2">
              {usuarios.map((u: any) => {
                const roleCfg = ROLE_CFG[u.role] || ROLE_CFG.tecnico;
                return (
                  <div key={u.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{u.nome}</p>
                      <p className="text-xs text-muted-foreground">{u.email || "—"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${roleCfg.color}`}>{roleCfg.label}</span>
                      <button onClick={() => { setEditingId(u.id); setForm({ nome: u.nome, email: u.email || "", role: u.role || "tecnico" }); setOpen(true); }}
                        className="p-1.5 rounded hover:bg-muted"><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></button>
                      <button onClick={() => { if (confirm("Excluir?")) remove.mutate(u.id); }}
                        className="p-1.5 rounded hover:bg-muted"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-card border shadow-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold">{editingId ? "Editar Usuário" : "Novo Usuário"}</h2>
            <div className="space-y-3">
              <div><label className="text-sm font-medium">Nome *</label>
                <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" /></div>
              <div><label className="text-sm font-medium">Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" /></div>
              <div><label className="text-sm font-medium">Perfil</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none bg-background">
                  <option value="admin">Admin</option>
                  <option value="gestor">Gestor</option>
                  <option value="tecnico">Técnico</option>
                  <option value="operador">Operador</option>
                </select></div>
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