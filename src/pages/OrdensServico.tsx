import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, Pencil, Trash2, Printer } from "lucide-react";
import { toast } from "sonner";

const hoje = new Date().toISOString().split("T")[0];

const STATUS_BADGE: Record<string, string> = {
  "Aberta": "bg-amber-100 text-amber-700",
  "Em Andamento": "bg-blue-100 text-blue-700",
  "Finalizada": "bg-green-100 text-green-700",
  "Cancelada": "bg-slate-100 text-slate-600",
};

const FORM_VAZIO = { equipamento_id: "", descricao: "", responsavel_id: "", status: "Aberta", solucao: "", data_abertura: hoje, data_previsao: "" };

export default function OrdensServico() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todas");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [tecnicoId, setTecnicoId] = useState("");
  const [tecnicoHoras, setTecnicoHoras] = useState("");
  const pendingPecas = useRef<{ pecaId: string; quantidade: number }[]>([]);

  const { data: ordens = [], isLoading } = useQuery({
    queryKey: ["ordens-servico"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ordens_servico")
        .select("*, equipamentos(nome, codigo), funcionarios:responsavel_id(nome)")
        .order("data_abertura", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: equipamentos = [] } = useQuery({
    queryKey: ["equipamentos-select"],
    queryFn: async () => {
      const { data } = await supabase.from("equipamentos").select("id, nome, codigo").order("nome");
      return data as any[] || [];
    },
  });

  const { data: funcionarios = [] } = useQuery({
    queryKey: ["funcionarios-select"],
    queryFn: async () => {
      const { data } = await supabase.from("funcionarios").select("id, nome").eq("ativo", true).order("nome");
      return data as any[] || [];
    },
  });

  const { data: pecas = [] } = useQuery({
    queryKey: ["pecas-select"],
    queryFn: async () => {
      const { data } = await supabase.from("pecas").select("id, nome, codigo, valor_unitario").order("nome");
      return data as any[] || [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.equipamento_id) throw new Error("Selecione um equipamento");
      if (!form.descricao.trim()) throw new Error("Preencha a descrição");
      if (!form.responsavel_id) throw new Error("Selecione um responsável");
      const payload: any = {
        equipamento_id: form.equipamento_id,
        descricao: form.descricao.trim(),
        responsavel_id: form.responsavel_id,
        status: form.status,
        solucao: form.solucao || null,
        data_abertura: form.data_abertura,
        data_previsao: form.data_previsao || null,
      };
      if (form.status === "Finalizada") payload.data_fechamento = new Date().toISOString().split("T")[0];

      if (editingId) {
        const { error } = await supabase.from("ordens_servico").update(payload).eq("id", editingId);
        if (error) throw error;
        return { id: editingId };
      } else {
        const { data, error } = await supabase.from("ordens_servico").insert(payload).select().single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: async (os: any) => {
      if (!editingId && tecnicoId && tecnicoHoras) {
        await supabase.from("os_tecnicos").insert({ os_id: os.id, funcionario_id: tecnicoId, horas: Number(tecnicoHoras) });
      }
      qc.invalidateQueries({ queryKey: ["ordens-servico"] });
      toast.success(editingId ? "OS atualizada!" : "OS criada!");
      setOpen(false); setEditingId(null); setForm(FORM_VAZIO);
      setTecnicoId(""); setTecnicoHoras("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("os_pecas").delete().eq("os_id", id);
      const { error } = await supabase.from("ordens_servico").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ordens-servico"] }); toast.success("OS excluída!"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = ordens.filter((os: any) => {
    const matchSearch = os.descricao?.toLowerCase().includes(search.toLowerCase()) || os.equipamentos?.nome?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "todas" || os.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusFilters = ["todas", "Aberta", "Em Andamento", "Finalizada", "Cancelada"];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Ordens de Serviço</h1>
        <button onClick={() => { setEditingId(null); setForm(FORM_VAZIO); setTecnicoId(""); setTecnicoHoras(""); setOpen(true); }}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" />Nova OS
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar OS, equipamento..."
            className="w-full rounded-md border pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {statusFilters.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${statusFilter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}>
              {s === "todas" ? "Todas" : s}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Equipamento</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Descrição</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Responsável</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Abertura</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Previsão</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Nenhuma OS encontrada.</td></tr>
              ) : filtered.map((os: any) => (
                <tr key={os.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{os.equipamentos?.nome || "—"}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground truncate max-w-[200px]">{os.descricao}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[os.status] || "bg-slate-100 text-slate-600"}`}>{os.status}</span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">{os.funcionarios?.nome || "—"}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                    {os.data_abertura ? new Date(os.data_abertura + "T12:00:00").toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {os.data_previsao ? (
                      <span className={new Date(os.data_previsao) < new Date() && os.status !== "Finalizada" ? "text-red-500 font-medium" : "text-muted-foreground"}>
                        {new Date(os.data_previsao + "T12:00:00").toLocaleDateString("pt-BR")}
                      </span>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 items-center">
                      <button onClick={() => { setEditingId(os.id); setForm({ equipamento_id: os.equipamento_id || "", descricao: os.descricao || "", responsavel_id: os.responsavel_id || "", status: os.status || "Aberta", solucao: os.solucao || "", data_abertura: os.data_abertura || hoje, data_previsao: os.data_previsao || "" }); setOpen(true); }}
                        className="p-1.5 rounded hover:bg-muted"><Pencil className="h-4 w-4 text-muted-foreground" /></button>
                      <button onClick={() => { if (confirm("Excluir esta OS?")) remove.mutate(os.id); }}
                        className="p-1.5 rounded hover:bg-muted"><Trash2 className="h-4 w-4 text-destructive" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-card border shadow-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold">{editingId ? "Editar OS" : "Nova Ordem de Serviço"}</h2>
            <div className="space-y-3">
              <div><label className="text-sm font-medium">Equipamento *</label>
                <select value={form.equipamento_id} onChange={e => setForm(f => ({ ...f, equipamento_id: e.target.value }))} className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none bg-background">
                  <option value="">Selecione...</option>
                  {equipamentos.map((eq: any) => <option key={eq.id} value={eq.id}>{eq.nome} ({eq.codigo})</option>)}
                </select></div>
              <div><label className="text-sm font-medium">Descrição *</label>
                <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} rows={3} className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none" /></div>
              <div><label className="text-sm font-medium">Responsável *</label>
                <select value={form.responsavel_id} onChange={e => setForm(f => ({ ...f, responsavel_id: e.target.value }))} className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none bg-background">
                  <option value="">Selecione...</option>
                  {funcionarios.map((f: any) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                </select></div>
              <div><label className="text-sm font-medium">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none bg-background">
                  <option value="Aberta">Aberta</option>
                  <option value="Em Andamento">Em Andamento</option>
                  <option value="Finalizada">Finalizada</option>
                  <option value="Cancelada">Cancelada</option>
                </select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium">Data abertura</label>
                  <input type="date" value={form.data_abertura} onChange={e => setForm(f => ({ ...f, data_abertura: e.target.value }))} className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" /></div>
                <div><label className="text-sm font-medium">Previsão término</label>
                  <input type="date" value={form.data_previsao} onChange={e => setForm(f => ({ ...f, data_previsao: e.target.value }))} className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" /></div>
              </div>
              <div><label className="text-sm font-medium">Solução aplicada {form.status === "Finalizada" && <span className="text-destructive">*</span>}</label>
                <textarea value={form.solucao} onChange={e => setForm(f => ({ ...f, solucao: e.target.value }))} rows={2} className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none" /></div>
              {!editingId && (
                <div><label className="text-sm font-medium">Técnico</label>
                  <div className="flex gap-2 mt-1">
                    <select value={tecnicoId} onChange={e => setTecnicoId(e.target.value)} className="flex-1 rounded-md border px-3 py-2 text-sm outline-none bg-background">
                      <option value="">Selecionar técnico...</option>
                      {funcionarios.map((f: any) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                    </select>
                    <input type="number" value={tecnicoHoras} onChange={e => setTecnicoHoras(e.target.value)} placeholder="Horas" className="w-24 rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setOpen(false)} className="rounded-md border px-4 py-2 text-sm hover:bg-muted">Cancelar</button>
              <button onClick={() => save.mutate()} disabled={save.isPending} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                {save.isPending ? "Salvando..." : editingId ? "Salvar" : "Criar OS"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}