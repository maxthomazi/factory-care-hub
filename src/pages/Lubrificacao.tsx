import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Pencil, Trash2, Droplets } from "lucide-react";
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

const FORM_VAZIO = {
  ponto: "",
  equipamento_id: "",
  tipo_lubrificante: "",
  frequencia: "",
  ultima_data: "",
  proxima_data: "",
  observacoes: "",
};

export default function Lubrificacao() {
  const qc = useQueryClient();
  const { empresaId } = useAuth();
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);

  const { data: lubrificacoes = [], isLoading } = useQuery({
    queryKey: ["lubrificacoes", empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lubrificacoes")
        .select("*, equipamentos(nome)")
        .order("proxima_data");
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: equipamentos = [] } = useQuery({
    queryKey: ["equipamentos-select", empresaId],
    queryFn: async () => {
      const { data } = await supabase
        .from("equipamentos")
        .select("id, nome, codigo")
        .order("nome");
      return data as any[] || [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.ponto.trim()) throw new Error("Preencha o ponto de lubrificação");
      const eq = equipamentos.find((e: any) => e.id === form.equipamento_id);
      const payload = {
        ponto: form.ponto.trim(),
        equipamento_id: form.equipamento_id || null,
        equipamento_nome: eq?.nome || null,
        tipo_lubrificante: form.tipo_lubrificante || null,
        frequencia: form.frequencia || null,
        ultima_data: form.ultima_data || null,
        proxima_data: form.proxima_data || null,
        observacoes: form.observacoes || null,
        empresa_id: empresaId,
      };
      if (editingId) {
        const { error } = await supabase.from("lubrificacoes").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("lubrificacoes").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lubrificacoes"] });
      toast.success(editingId ? "Atualizado!" : "Ponto de lubrificação cadastrado!");
      setOpen(false); setEditingId(null); setForm(FORM_VAZIO);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lubrificacoes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lubrificacoes"] });
      toast.success("Excluído!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const comStatus = lubrificacoes.map(l => ({ ...l, _status: getStatus(l.proxima_data) }));
  const total = comStatus.length;
  const atrasados = comStatus.filter(l => l._status === "atrasada").length;
  const filtrados = filtro === "todos" ? comStatus : comStatus.filter(l => l._status === filtro);

  function abrirEdicao(l: any) {
    setEditingId(l.id);
    setForm({
      ponto: l.ponto,
      equipamento_id: l.equipamento_id || "",
      tipo_lubrificante: l.tipo_lubrificante || "",
      frequencia: l.frequencia || "",
      ultima_data: l.ultima_data || "",
      proxima_data: l.proxima_data || "",
      observacoes: l.observacoes || "",
    });
    setOpen(true);
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Lubrificação</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total} ponto{total !== 1 ? "s" : ""} cadastrado{total !== 1 ? "s" : ""}
            {atrasados > 0 && (
              <span className="text-red-500 font-medium">
                {" "}· {atrasados} atrasado{atrasados !== 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => { setEditingId(null); setForm(FORM_VAZIO); setOpen(true); }}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Novo ponto
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {FILTROS.map(f => (
          <button
            key={f.value}
            onClick={() => setFiltro(f.value as Filtro)}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium border transition-all",
              filtro === f.value
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-center text-muted-foreground py-8">Carregando...</p>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Droplets className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum ponto de lubrificação encontrado.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtrados.map(l => {
            const sc = STATUS_CFG[l._status];
            const isAtrasada = l._status === "atrasada";
            const proxFmt = l.proxima_data
              ? new Date(l.proxima_data + "T12:00:00").toLocaleDateString("pt-BR")
              : "—";
            const ultFmt = l.ultima_data
              ? new Date(l.ultima_data + "T12:00:00").toLocaleDateString("pt-BR")
              : "—";
            return (
              <div
                key={l.id}
                className="rounded-2xl border bg-card flex flex-col overflow-hidden hover:shadow-md hover:border-primary/30 transition-all"
              >
                <div className="flex items-start gap-3 px-4 pt-4 pb-3">
                  <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <Droplets className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm leading-tight">{l.ponto}</h3>
                    {l.tipo_lubrificante && (
                      <p className="text-xs text-muted-foreground mt-0.5">{l.tipo_lubrificante}</p>
                    )}
                  </div>
                  <span className={cn("shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium", sc.color)}>
                    {sc.label}
                  </span>
                </div>

                <div className="px-4 py-3 border-t border-border space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Frequência</span>
                    <span className="font-medium">{l.frequencia || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Última aplicação</span>
                    <span className="font-medium">{ultFmt}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Próxima</span>
                    <span className={cn("font-medium", isAtrasada && "text-red-500")}>{proxFmt}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between px-4 py-3 border-t border-border mt-auto">
                  <span className="text-xs text-muted-foreground truncate">
                    {l.equipamentos?.nome || l.equipamento_nome || "—"}
                  </span>
                  <div className="flex gap-1 shrink-0 ml-2">
                    <button
                      onClick={() => abrirEdicao(l)}
                      className="h-7 w-7 rounded-lg border flex items-center justify-center hover:bg-muted transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => { if (confirm("Excluir este ponto?")) remove.mutate(l.id); }}
                      className="h-7 w-7 rounded-lg border border-red-200 flex items-center justify-center hover:bg-red-50 transition-colors"
                    >
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
          <div className="w-full max-w-md rounded-xl bg-card border shadow-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold">
              {editingId ? "Editar ponto de lubrificação" : "Novo ponto de lubrificação"}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Ponto de lubrificação *</label>
                <input
                  value={form.ponto}
                  onChange={e => setForm(f => ({ ...f, ponto: e.target.value }))}
                  placeholder="ex: Rolamento do motor principal"
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Equipamento</label>
                <select
                  value={form.equipamento_id}
                  onChange={e => setForm(f => ({ ...f, equipamento_id: e.target.value }))}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none bg-background"
                >
                  <option value="">Selecione...</option>
                  {equipamentos.map((eq: any) => (
                    <option key={eq.id} value={eq.id}>{eq.nome} ({eq.codigo})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Tipo de lubrificante</label>
                <input
                  value={form.tipo_lubrificante}
                  onChange={e => setForm(f => ({ ...f, tipo_lubrificante: e.target.value }))}
                  placeholder="ex: Grease Shell Gadus S3, Mobil SHC 629"
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Frequência</label>
                <input
                  value={form.frequencia}
                  onChange={e => setForm(f => ({ ...f, frequencia: e.target.value }))}
                  placeholder="ex: 30 dias, 500 horas"
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Última aplicação</label>
                <input
                  type="date"
                  value={form.ultima_data}
                  onChange={e => setForm(f => ({ ...f, ultima_data: e.target.value }))}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Próxima aplicação</label>
                <input
                  type="date"
                  value={form.proxima_data}
                  onChange={e => setForm(f => ({ ...f, proxima_data: e.target.value }))}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Observações</label>
                <textarea
                  value={form.observacoes}
                  onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                  rows={3}
                  placeholder="Quantidade, método, cuidados especiais..."
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setOpen(false)}
                className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                onClick={() => save.mutate()}
                disabled={save.isPending}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {save.isPending ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
