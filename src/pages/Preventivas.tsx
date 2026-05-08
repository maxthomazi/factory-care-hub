import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Filtro = "todos" | "atrasada" | "proxima" | "em_dia";

function getStatus(proxima_data: string | null): "atrasada" | "proxima" | "em_dia" {
  if (!proxima_data) return "em_dia";
  const hoje = new Date();
  const prox = new Date(proxima_data + "T12:00:00");
  const diff = Math.ceil((prox.getTime() - hoje.getTime()) / 86400000);
  if (diff < 0) return "atrasada";
  if (diff <= 7) return "proxima";
  return "em_dia";
}

const STATUS_CFG = {
  atrasada: { label: "Atrasada", color: "bg-red-100 text-red-700 border-red-200" },
  proxima:  { label: "Próxima",  color: "bg-amber-100 text-amber-700 border-amber-200" },
  em_dia:   { label: "Em dia",   color: "bg-green-100 text-green-700 border-green-200" },
};

const FILTROS = [
  { value: "todos",    label: "Todos"       },
  { value: "atrasada", label: "Atrasados"   },
  { value: "proxima",  label: "Esta semana" },
  { value: "em_dia",   label: "Em dia"      },
];

const FORM_VAZIO = { titulo: "", equipamento_id: "", equipamento_nome: "", frequencia: "", proxima_data: "" };

export default function Preventivas() {
  const qc = useQueryClient();
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);

  const { data: preventivas = [], isLoading } = useQuery({
    queryKey: ["preventivas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("preventivas").select("*, equipamentos(nome)").order("proxima_data");
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

  const save = useMutation({
    mutationFn: async () => {
      if (!form.titulo.trim()) throw new Error("Preencha o título");
      const eq = equipamentos.find((e: any) => e.id === form.equipamento_id);
      const payload = {
        titulo: form.titulo.trim(),
        equipamento_id: form.equipamento_id || null,
        equipamento_nome: eq?.nome || form.equipamento_nome || null,
        frequencia: form.frequencia || null,
        proxima_data: form.proxima_data || null,
        status: "em_dia",
      };
      if (editingId) {
        const { error } = await supabase.from("preventivas").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("preventivas").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["preventivas"] });
      toast.success(editingId ? "Atualizada!" : "Preventiva criada!");
      setOpen(false); setEditingId(null); setForm(FORM_VAZIO);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("preventivas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["preventivas"] }); toast.success("Excluída!"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const planosComStatus = preventivas.map(p => ({ ...p, _status: getStatus(p.proxima_data) }));
  const ativos = planosComStatus.length;
  const atrasados = planosComStatus.filter(p => p._status === "atrasada").length;
  const filtrados = filtro === "todos" ? planosComStatus : planosComStatus.filter(p => p._status === filtro);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Manutenções Preventivas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {ativos} plano{ativos !== 1 ? "s" : ""} ativo{ativos !== 1 ? "s" : ""}
            {atrasados > 0 && <span className="text-red-500 font-medium"> · {atrasados} atrasado{atrasados !== 1 ? "s" : ""}</span>}
          </p>
        </div>
        <button onClick={() => { setEditingId(null); setForm(FORM_VAZIO); setOpen(true); }}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" />Novo plano
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {FILTROS.map(f => (
          <button key={f.value} onClick={() => setFiltro(f.value as Filtro)}
            className={cn("px-4 py-1.5 rounded-full text-sm font-medium border transition-all",
              filtro === f.value ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground")}>
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? <p className="text-center text-muted-foreground py-8">Carregando...</p> :
        filtrados.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <CalendarClock className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum plano encontrado.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtrados.map(p => {
              const sc = STATUS_CFG[p._status];
              const isAtrasada = p._status === "atrasada";
              const dataFmt = p.proxima_data ? new Date(p.proxima_data + "T12:00:00").toLocaleDateString("pt-BR") : "—";
              return (
                <div key={p.id} className="rounded-2xl border bg-card flex flex-col overflow-hidden hover:shadow-md hover:border-primary/30 transition-all">
                  <div className="flex items-start gap-3 px-4 pt-4 pb-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <CalendarClock className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm leading-tight">{p.titulo}</h3>
                    </div>
                    <span className={cn("shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium", sc.color)}>{sc.label}</span>
                  </div>
                  <div className="px-4 py-3 border-t border-border space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Frequência</span>
                      <span className="font-medium">{p.frequencia || "—"}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Próxima</span>
                      <span className={cn("font-medium", isAtrasada && "text-red-500")}>{dataFmt}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3 border-t border-border mt-auto">
                    <span className="text-xs text-muted-foreground truncate">{p.equipamento_nome || p.equipamentos?.nome || "—"}</span>
                    <div className="flex gap-1 shrink-0 ml-2">
                      <button onClick={() => { setEditingId(p.id); setForm({ titulo: p.titulo, equipamento_id: p.equipamento_id || "", equipamento_nome: p.equipamento_nome || "", frequencia: p.frequencia || "", proxima_data: p.proxima_data || "" }); setOpen(true); }}
                        className="h-7 w-7 rounded-lg border flex items-center justify-center hover:bg-muted transition-colors">
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      <button onClick={() => { if (confirm("Excluir?")) remove.mutate(p.id); }}
                        className="h-7 w-7 rounded-lg border border-red-200 flex items-center justify-center hover:bg-red-50 transition-colors">
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-card border shadow-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold">{editingId ? "Editar Preventiva" : "Nova Preventiva"}</h2>
            <div className="space-y-3">
              <div><label className="text-sm font-medium">Título *</label>
                <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" /></div>
              <div><label className="text-sm font-medium">Equipamento</label>
                <select value={form.equipamento_id} onChange={e => setForm(f => ({ ...f, equipamento_id: e.target.value }))} className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none bg-background">
                  <option value="">Selecione...</option>
                  {equipamentos.map((eq: any) => <option key={eq.id} value={eq.id}>{eq.nome} ({eq.codigo})</option>)}
                </select></div>
              <div><label className="text-sm font-medium">Frequência</label>
                <input value={form.frequencia} onChange={e => setForm(f => ({ ...f, frequencia: e.target.value }))} placeholder="ex: 30 dias, 6 meses" className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" /></div>
              <div><label className="text-sm font-medium">Próxima data</label>
                <input type="date" value={form.proxima_data} onChange={e => setForm(f => ({ ...f, proxima_data: e.target.value }))} className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" /></div>
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