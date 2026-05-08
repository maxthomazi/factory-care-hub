import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, MapPin, Pencil, Trash2, History, ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";
import { toast } from "sonner";

function GarantiaBadge({ garantia_ate }: { garantia_ate?: string | null }) {
  if (!garantia_ate) return null;
  const hoje = new Date();
  const venc = new Date(garantia_ate + "T12:00:00");
  const dias = Math.ceil((venc.getTime() - hoje.getTime()) / 86400000);
  if (dias < 0) return <span className="flex items-center gap-1 rounded-full bg-red-100 border border-red-200 px-2 py-0.5 text-xs text-red-700 font-medium"><ShieldX className="h-3 w-3" />Garantia vencida</span>;
  if (dias <= 30) return <span className="flex items-center gap-1 rounded-full bg-amber-100 border border-amber-200 px-2 py-0.5 text-xs text-amber-700 font-medium"><ShieldAlert className="h-3 w-3" />Garantia: {dias}d</span>;
  return <span className="flex items-center gap-1 rounded-full bg-green-100 border border-green-200 px-2 py-0.5 text-xs text-green-700 font-medium"><ShieldCheck className="h-3 w-3" />Garantia OK</span>;
}

const FORM_VAZIO = { nome: "", codigo: "", localizacao: "", status: "operando", criticidade: "", grupo: "", modelo: "", centro_custo: "", numero_serie: "", classificacao: "equipamento", garantia_ate: "" };

export default function Equipamentos() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [showExtras, setShowExtras] = useState(false);

  const { data: equipamentos = [], isLoading } = useQuery({
    queryKey: ["equipamentos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("equipamentos").select("*").order("nome");
      if (error) throw error;
      return data as any[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.nome || !form.codigo) throw new Error("Preencha nome e código");
      const payload = { ...form, criticidade: form.criticidade || null, garantia_ate: form.garantia_ate || null };
      if (editingId) {
        const { error } = await supabase.from("equipamentos").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("equipamentos").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["equipamentos"] });
      toast.success(editingId ? "Atualizado!" : "Equipamento criado!");
      setOpen(false); setEditingId(null); setForm(FORM_VAZIO);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("equipamentos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["equipamentos"] }); toast.success("Excluído!"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = equipamentos.filter((eq: any) =>
    eq.nome?.toLowerCase().includes(search.toLowerCase()) ||
    eq.codigo?.toLowerCase().includes(search.toLowerCase()) ||
    eq.localizacao?.toLowerCase().includes(search.toLowerCase())
  );

  const criticidadeCor: Record<string, string> = { A: "bg-red-100 text-red-800 border-red-200", B: "bg-amber-100 text-amber-800 border-amber-200", C: "bg-green-100 text-green-800 border-green-200" };
  const statusCor: Record<string, string> = { operando: "bg-green-100 text-green-700", em_manutencao: "bg-amber-100 text-amber-700", parado: "bg-red-100 text-red-700", inativo: "bg-slate-100 text-slate-600" };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Equipamentos</h1>
        <button onClick={() => { setEditingId(null); setForm(FORM_VAZIO); setOpen(true); }}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" />Novo Equipamento
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar equipamento..."
          className="w-full rounded-md border pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
      </div>

      {isLoading ? <p className="text-center text-muted-foreground py-8">Carregando...</p> :
        filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">Nenhum equipamento cadastrado.</p> : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((eq: any) => (
              <div key={eq.id} className="kpi-card hover:border-primary/30 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{eq.nome}</h3>
                    <p className="text-xs text-muted-foreground">{eq.codigo}</p>
                  </div>
                  <div className="flex items-center gap-1.5 ml-2 shrink-0">
                    {eq.criticidade && <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${criticidadeCor[eq.criticidade]}`}>{eq.criticidade}</span>}
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusCor[eq.status] || "bg-slate-100 text-slate-600"}`}>{eq.status || "—"}</span>
                  </div>
                </div>
                <div className="space-y-1.5 text-sm mb-3">
                  {eq.localizacao && <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-3.5 w-3.5" /><span>{eq.localizacao}</span></div>}
                  {eq.grupo && <p className="text-xs text-muted-foreground">Grupo: {eq.grupo}</p>}
                  <GarantiaBadge garantia_ate={eq.garantia_ate} />
                </div>
                <div className="flex items-center justify-end gap-1 pt-2 border-t border-border">
                  <button onClick={() => navigate(`/equipamentos/${eq.id}/historico`)} title="Ver histórico" className="p-1.5 rounded hover:bg-muted"><History className="h-4 w-4 text-muted-foreground" /></button>
                  <button onClick={() => { setEditingId(eq.id); setForm({ nome: eq.nome, codigo: eq.codigo, localizacao: eq.localizacao || "", status: eq.status || "operando", criticidade: eq.criticidade || "", grupo: eq.grupo || "", modelo: eq.modelo || "", centro_custo: eq.centro_custo || "", numero_serie: eq.numero_serie || "", classificacao: eq.classificacao || "equipamento", garantia_ate: eq.garantia_ate || "" }); setOpen(true); }} className="p-1.5 rounded hover:bg-muted"><Pencil className="h-4 w-4 text-muted-foreground" /></button>
                  <button onClick={() => { if (confirm("Excluir?")) remove.mutate(eq.id); }} className="p-1.5 rounded hover:bg-muted"><Trash2 className="h-4 w-4 text-destructive" /></button>
                </div>
              </div>
            ))}
          </div>
        )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-card border shadow-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold">{editingId ? "Editar Equipamento" : "Novo Equipamento"}</h2>
            <div className="space-y-3">
              <div><label className="text-sm font-medium">Nome *</label>
                <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" /></div>
              <div><label className="text-sm font-medium">Código *</label>
                <input value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" /></div>
              <div><label className="text-sm font-medium">Localização</label>
                <input value={form.localizacao} onChange={e => setForm(f => ({ ...f, localizacao: e.target.value }))} className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" /></div>
              <div><label className="text-sm font-medium">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none bg-background focus:ring-2 focus:ring-ring">
                  <option value="operando">Operando</option>
                  <option value="em_manutencao">Em Manutenção</option>
                  <option value="parado">Parado</option>
                  <option value="inativo">Inativo</option>
                </select></div>

              <button type="button" onClick={() => setShowExtras(v => !v)} className="text-sm text-primary hover:underline">
                {showExtras ? "▲ Ocultar" : "▼ Informações adicionais"}
              </button>

              {showExtras && (
                <div className="space-y-3 border-t pt-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-sm font-medium">Criticidade</label>
                      <select value={form.criticidade} onChange={e => setForm(f => ({ ...f, criticidade: e.target.value }))} className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none bg-background">
                        <option value="">Selecione</option>
                        <option value="A">A — Crítico</option>
                        <option value="B">B — Importante</option>
                        <option value="C">C — Auxiliar</option>
                      </select></div>
                    <div><label className="text-sm font-medium">Grupo</label>
                      <input value={form.grupo} onChange={e => setForm(f => ({ ...f, grupo: e.target.value }))} className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-sm font-medium">Modelo</label>
                      <input value={form.modelo} onChange={e => setForm(f => ({ ...f, modelo: e.target.value }))} className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" /></div>
                    <div><label className="text-sm font-medium">Nº Série</label>
                      <input value={form.numero_serie} onChange={e => setForm(f => ({ ...f, numero_serie: e.target.value }))} className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" /></div>
                  </div>
                  <div><label className="text-sm font-medium">Garantia até</label>
                    <input type="date" value={form.garantia_ate} onChange={e => setForm(f => ({ ...f, garantia_ate: e.target.value }))} className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" /></div>
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setOpen(false)} className="rounded-md border px-4 py-2 text-sm hover:bg-muted">Cancelar</button>
              <button onClick={() => save.mutate()} disabled={save.isPending} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                {save.isPending ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}