import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, Search, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function Estoque() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: "", codigo: "", quantidade: "", estoque_minimo: "", unidade: "un", valor_unitario: "" });

  const { data: pecas = [], isLoading } = useQuery({
    queryKey: ["pecas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pecas").select("*").order("nome");
      if (error) throw error;
      return data as any[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.nome.trim()) throw new Error("Preencha o nome");
      const payload = {
        nome: form.nome.trim(),
        codigo: form.codigo.trim() || null,
        quantidade: Number(form.quantidade) || 0,
        estoque_minimo: Number(form.estoque_minimo) || 0,
        unidade: form.unidade || "un",
        valor_unitario: Number(form.valor_unitario) || 0,
      };
      if (editingId) {
        const { error } = await supabase.from("pecas").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("pecas").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pecas"] });
      toast.success(editingId ? "Peça atualizada!" : "Peça criada!");
      setOpen(false); setEditingId(null);
      setForm({ nome: "", codigo: "", quantidade: "", estoque_minimo: "", unidade: "un", valor_unitario: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pecas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pecas"] }); toast.success("Excluída!"); },
    onError: (e: Error) => toast.error(e.message),
  });

  function openCreate() { setEditingId(null); setForm({ nome: "", codigo: "", quantidade: "", estoque_minimo: "", unidade: "un", valor_unitario: "" }); setOpen(true); }
  function openEdit(p: any) {
    setEditingId(p.id);
    setForm({ nome: p.nome, codigo: p.codigo || "", quantidade: String(p.quantidade || ""), estoque_minimo: String(p.estoque_minimo || ""), unidade: p.unidade || "un", valor_unitario: String(p.valor_unitario || "") });
    setOpen(true);
  }

  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
  const filtered = pecas.filter(p => p.nome?.toLowerCase().includes(search.toLowerCase()) || p.codigo?.toLowerCase().includes(search.toLowerCase()));
  const abaixoMinimo = pecas.filter(p => p.quantidade <= p.estoque_minimo).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Estoque</h1>
          {abaixoMinimo > 0 && (
            <p className="text-sm text-amber-600 flex items-center gap-1 mt-0.5">
              <AlertTriangle className="h-3.5 w-3.5" />{abaixoMinimo} peça(s) abaixo do mínimo
            </p>
          )}
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" />Nova Peça
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar peça..."
          className="w-full rounded-md border pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nome</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Código</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Qtd</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Mínimo</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Valor Unit.</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Carregando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Nenhuma peça encontrada.</td></tr>
            ) : filtered.map(p => {
              const baixo = p.quantidade <= p.estoque_minimo;
              return (
                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{p.nome}</td>
                  <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">{p.codigo || "—"}</td>
                  <td className={`px-4 py-3 text-right font-medium ${baixo ? "text-red-500" : ""}`}>
                    {p.quantidade} {p.unidade}
                    {baixo && <AlertTriangle className="h-3.5 w-3.5 inline ml-1" />}
                  </td>
                  <td className="px-4 py-3 text-right hidden md:table-cell text-muted-foreground">{p.estoque_minimo} {p.unidade}</td>
                  <td className="px-4 py-3 text-right hidden lg:table-cell text-muted-foreground">{fmt(p.valor_unitario || 0)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(p)} className="p-1.5 rounded hover:bg-muted"><Pencil className="h-4 w-4 text-muted-foreground" /></button>
                      <button onClick={() => { if (confirm("Excluir?")) remove.mutate(p.id); }} className="p-1.5 rounded hover:bg-muted"><Trash2 className="h-4 w-4 text-destructive" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-card border shadow-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold">{editingId ? "Editar Peça" : "Nova Peça"}</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Nome *</label>
                <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Código</label>
                  <input value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))}
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="text-sm font-medium">Unidade</label>
                  <select value={form.unidade} onChange={e => setForm(f => ({ ...f, unidade: e.target.value }))}
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring bg-background">
                    <option value="un">un</option>
                    <option value="kg">kg</option>
                    <option value="m">m</option>
                    <option value="l">l</option>
                    <option value="cx">cx</option>
                    <option value="par">par</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium">Quantidade</label>
                  <input type="number" value={form.quantidade} onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))}
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="text-sm font-medium">Estoque mín.</label>
                  <input type="number" value={form.estoque_minimo} onChange={e => setForm(f => ({ ...f, estoque_minimo: e.target.value }))}
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="text-sm font-medium">Valor unit.</label>
                  <input type="number" value={form.valor_unitario} onChange={e => setForm(f => ({ ...f, valor_unitario: e.target.value }))}
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
                </div>
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