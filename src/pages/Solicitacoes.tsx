import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Clock, AlertTriangle, Send, UserCheck, CheckCircle2, XCircle, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const URGENCIA = {
  baixa:   { label: "Baixa",   color: "bg-slate-100 text-slate-700" },
  media:   { label: "Média",   color: "bg-blue-100 text-blue-700"   },
  alta:    { label: "Alta",    color: "bg-amber-100 text-amber-700" },
  critica: { label: "Crítica", color: "bg-red-100 text-red-700"     },
};

const PRIORIDADE = {
  emergencial: { label: "Emergencial", color: "bg-red-100 text-red-700"    },
  alta:        { label: "Alta",        color: "bg-amber-100 text-amber-700" },
  media:       { label: "Média",       color: "bg-blue-100 text-blue-700"   },
  baixa:       { label: "Baixa",       color: "bg-slate-100 text-slate-600" },
};

const STATUS_TABS = [
  { value: "pendente",    label: "Pendentes"    },
  { value: "distribuida", label: "Distribuídas" },
  { value: "resolvida",   label: "Resolvidas"   },
  { value: "os_criada",   label: "OS criada"    },
  { value: "rejeitada",   label: "Rejeitadas"   },
  { value: "todas",       label: "Todas"        },
];

export default function Solicitacoes() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("pendente");
  const [showNova, setShowNova] = useState(false);
  const [showDistribuir, setShowDistribuir] = useState<any>(null);
  const [acao, setAcao] = useState<{ id: string; tipo: "resolver" | "criarOS" | "rejeitar" } | null>(null);
  const [texto, setTexto] = useState("");
  const [novaForm, setNovaForm] = useState({ equipamento_id: "", descricao: "", urgencia: "media", solicitante_nome: "", solicitante_contato: "" });
  const [distForm, setDistForm] = useState({ executor_id: "", executor_nome: "", prioridade: "media", observacao: "" });

  const { data: solicitacoes = [], isLoading } = useQuery({
    queryKey: ["solicitacoes", tab],
    queryFn: async () => {
      let q = supabase.from("solicitacoes_servico").select("*, equipamentos(nome, codigo)").order("created_at", { ascending: false });
      if (tab !== "todas") q = q.eq("status", tab);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: pendentesCount = 0 } = useQuery({
    queryKey: ["solicitacoes_count"],
    queryFn: async () => {
      const { count } = await supabase.from("solicitacoes_servico").select("*", { count: "exact", head: true }).eq("status", "pendente");
      return count ?? 0;
    },
    refetchInterval: 60000,
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

  const criar = useMutation({
    mutationFn: async () => {
      if (!novaForm.equipamento_id || !novaForm.descricao.trim()) throw new Error("Preencha equipamento e descrição");
      const { error } = await supabase.from("solicitacoes_servico").insert({
        equipamento_id: novaForm.equipamento_id,
        descricao: novaForm.descricao.trim(),
        urgencia: novaForm.urgencia,
        solicitante_nome: novaForm.solicitante_nome || null,
        solicitante_contato: novaForm.solicitante_contato || null,
        status: "pendente",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["solicitacoes"] });
      qc.invalidateQueries({ queryKey: ["solicitacoes_count"] });
      toast.success("Solicitação aberta!");
      setShowNova(false);
      setNovaForm({ equipamento_id: "", descricao: "", urgencia: "media", solicitante_nome: "", solicitante_contato: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const distribuir = useMutation({
    mutationFn: async (id: string) => {
      if (!distForm.executor_nome.trim()) throw new Error("Selecione o executor");
      const { error } = await supabase.from("solicitacoes_servico").update({
        status: "distribuida",
        executor_nome: distForm.executor_nome,
        prioridade: distForm.prioridade,
        observacao_aprovador: distForm.observacao || null,
        distribuida_em: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["solicitacoes"] });
      qc.invalidateQueries({ queryKey: ["solicitacoes_count"] });
      toast.success("Distribuída!");
      setShowDistribuir(null);
      setDistForm({ executor_id: "", executor_nome: "", prioridade: "media", observacao: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const executarAcao = useMutation({
    mutationFn: async () => {
      if (!acao) return;
      if (acao.tipo === "resolver") {
        if (!texto.trim()) throw new Error("Descreva a resolução");
        const { error } = await supabase.from("solicitacoes_servico").update({ status: "resolvida", resolucao: texto, resolvida_em: new Date().toISOString() }).eq("id", acao.id);
        if (error) throw error;
      } else if (acao.tipo === "criarOS") {
        const { data: sol } = await supabase.from("solicitacoes_servico").select("*").eq("id", acao.id).single();
        const { data: os, error: oe } = await supabase.from("ordens_servico").insert({ equipamento_id: sol.equipamento_id, descricao: sol.descricao, status: "Aberta", data_abertura: new Date().toISOString().split("T")[0] }).select().single();
        if (oe) throw oe;
        const { error } = await supabase.from("solicitacoes_servico").update({ status: "os_criada", os_id: os.id, resolvida_em: new Date().toISOString() }).eq("id", acao.id);
        if (error) throw error;
      } else if (acao.tipo === "rejeitar") {
        if (!texto.trim()) throw new Error("Informe o motivo");
        const { error } = await supabase.from("solicitacoes_servico").update({ status: "rejeitada", observacao_aprovador: texto }).eq("id", acao.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["solicitacoes"] });
      qc.invalidateQueries({ queryKey: ["solicitacoes_count"] });
      toast.success("Ação executada!");
      setAcao(null); setTexto("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Solicitações de serviço</h1>
          <p className="text-sm text-muted-foreground">Abertas por operadores via QR Code ou painel</p>
        </div>
        <div className="flex items-center gap-2">
          {pendentesCount > 0 && (
            <span className="flex items-center gap-1 rounded-lg bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-800">
              <AlertTriangle className="h-4 w-4" />{pendentesCount} pendente{pendentesCount !== 1 ? "s" : ""}
            </span>
          )}
          <button onClick={() => setShowNova(true)} className="flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" />Nova SS
          </button>
        </div>
      </div>

      <div className="flex gap-1 rounded-lg bg-muted p-1 overflow-x-auto">
        {STATUS_TABS.map(t => (
          <button key={t.value} onClick={() => setTab(t.value)}
            className={cn("flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap",
              tab === t.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? <p className="text-center text-muted-foreground py-8 text-sm">Carregando...</p> :
        solicitacoes.length === 0 ? <p className="text-center text-muted-foreground py-8 text-sm">Nenhuma solicitação encontrada.</p> : (
          <div className="space-y-3">
            {solicitacoes.map((sol: any) => {
              const urg = URGENCIA[sol.urgencia as keyof typeof URGENCIA] ?? URGENCIA.media;
              const prio = sol.prioridade ? PRIORIDADE[sol.prioridade as keyof typeof PRIORIDADE] : null;
              return (
                <div key={sol.id} className="rounded-lg border bg-card p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-md bg-muted p-1.5 shrink-0">
                      <ClipboardList className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{sol.equipamentos?.nome ?? "—"}</span>
                        {sol.equipamentos?.codigo && <span className="text-xs text-muted-foreground">{sol.equipamentos.codigo}</span>}
                        <div className="ml-auto flex gap-1.5">
                          {prio && <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", prio.color)}>{prio.label}</span>}
                          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", urg.color)}>{urg.label}</span>
                        </div>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{sol.descricao}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    {formatDistanceToNow(new Date(sol.created_at), { addSuffix: true, locale: ptBR })}
                    {sol.solicitante_nome && <span>· {sol.solicitante_nome}</span>}
                    {sol.executor_nome && <span className="flex items-center gap-1 text-blue-600"><UserCheck className="h-3 w-3" />Executor: {sol.executor_nome}</span>}
                  </div>

                  {sol.status === "pendente" && !acao && (
                    <div className="flex gap-2">
                      <button onClick={() => setShowDistribuir(sol)} className="flex-1 flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
                        <Send className="h-3.5 w-3.5" />Distribuir
                      </button>
                      <button onClick={() => setAcao({ id: sol.id, tipo: "rejeitar" })} className="flex-1 flex items-center justify-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10">
                        <XCircle className="h-3.5 w-3.5" />Rejeitar
                      </button>
                    </div>
                  )}

                  {sol.status === "distribuida" && !acao && (
                    <div className="space-y-2">
                      <div className="rounded-md bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-700">
                        <UserCheck className="h-3.5 w-3.5 inline mr-1" />Aguardando avaliação de <strong>{sol.executor_nome}</strong>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setAcao({ id: sol.id, tipo: "resolver" })} className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-green-200 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50">
                          <CheckCircle2 className="h-3.5 w-3.5" />Resolvido sem OS
                        </button>
                        <button onClick={() => setAcao({ id: sol.id, tipo: "criarOS" })} className="flex-1 flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
                          <ClipboardList className="h-3.5 w-3.5" />Criar OS
                        </button>
                      </div>
                    </div>
                  )}

                  {acao?.id === sol.id && (
                    <div className="space-y-2">
                      {acao.tipo !== "criarOS" && (
                        <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={2}
                          placeholder={acao.tipo === "resolver" ? "Descreva a resolução (obrigatório)..." : "Motivo da rejeição (obrigatório)..."}
                          className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none" />
                      )}
                      <div className="flex gap-2">
                        <button onClick={() => executarAcao.mutate()}
                          disabled={((acao.tipo === "resolver" || acao.tipo === "rejeitar") && !texto.trim()) || executarAcao.isPending}
                          className="flex-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                          {executarAcao.isPending ? "Processando..." : acao.tipo === "resolver" ? "Confirmar resolução" : acao.tipo === "criarOS" ? "Confirmar e criar OS" : "Confirmar rejeição"}
                        </button>
                        <button onClick={() => { setAcao(null); setTexto(""); }} className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted">Cancelar</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      {/* Modal Nova SS */}
      {showNova && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-card border shadow-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold">Nova Solicitação de Serviço</h2>
            <div className="space-y-3">
              <div><label className="text-sm font-medium">Equipamento *</label>
                <select value={novaForm.equipamento_id} onChange={e => setNovaForm(f => ({ ...f, equipamento_id: e.target.value }))} className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none bg-background">
                  <option value="">Selecione...</option>
                  {equipamentos.map((eq: any) => <option key={eq.id} value={eq.id}>{eq.nome} ({eq.codigo})</option>)}
                </select></div>
              <div><label className="text-sm font-medium">Descrição *</label>
                <textarea value={novaForm.descricao} onChange={e => setNovaForm(f => ({ ...f, descricao: e.target.value }))} rows={3} className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none" /></div>
              <div><label className="text-sm font-medium">Urgência</label>
                <select value={novaForm.urgencia} onChange={e => setNovaForm(f => ({ ...f, urgencia: e.target.value }))} className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none bg-background">
                  <option value="baixa">Baixa</option>
                  <option value="media">Média</option>
                  <option value="alta">Alta</option>
                  <option value="critica">Crítica</option>
                </select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium">Solicitante</label>
                  <input value={novaForm.solicitante_nome} onChange={e => setNovaForm(f => ({ ...f, solicitante_nome: e.target.value }))} className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" /></div>
                <div><label className="text-sm font-medium">Contato</label>
                  <input value={novaForm.solicitante_contato} onChange={e => setNovaForm(f => ({ ...f, solicitante_contato: e.target.value }))} className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" /></div>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowNova(false)} className="rounded-md border px-4 py-2 text-sm hover:bg-muted">Cancelar</button>
              <button onClick={() => criar.mutate()} disabled={criar.isPending} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                {criar.isPending ? "Abrindo..." : "Abrir solicitação"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Distribuir */}
      {showDistribuir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-card border shadow-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold">Distribuir Solicitação</h2>
            <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
              <p className="font-medium">{showDistribuir.equipamentos?.nome || "—"}</p>
              <p className="text-muted-foreground text-xs mt-0.5">{showDistribuir.descricao}</p>
            </div>
            <div className="space-y-3">
              <div><label className="text-sm font-medium">Executor *</label>
                <select value={distForm.executor_id} onChange={e => { const f = funcionarios.find((f: any) => f.id === e.target.value); setDistForm(d => ({ ...d, executor_id: e.target.value, executor_nome: f?.nome || "" })); }} className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none bg-background">
                  <option value="">Selecione...</option>
                  {funcionarios.map((f: any) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                </select></div>
              <div><label className="text-sm font-medium">Prioridade</label>
                <select value={distForm.prioridade} onChange={e => setDistForm(d => ({ ...d, prioridade: e.target.value }))} className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none bg-background">
                  <option value="emergencial">Emergencial</option>
                  <option value="alta">Alta</option>
                  <option value="media">Média</option>
                  <option value="baixa">Baixa</option>
                </select></div>
              <div><label className="text-sm font-medium">Observação (opcional)</label>
                <textarea value={distForm.observacao} onChange={e => setDistForm(d => ({ ...d, observacao: e.target.value }))} rows={2} className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none" /></div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowDistribuir(null)} className="rounded-md border px-4 py-2 text-sm hover:bg-muted">Cancelar</button>
              <button onClick={() => distribuir.mutate(showDistribuir.id)} disabled={!distForm.executor_nome || distribuir.isPending} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                {distribuir.isPending ? "Distribuindo..." : "Distribuir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}