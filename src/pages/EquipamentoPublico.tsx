import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Wrench, CheckCircle2, AlertTriangle } from "lucide-react";

const URGENCIA = [
  { value: "baixa",   label: "Baixa — sem risco imediato"       },
  { value: "media",   label: "Média — monitorar"                },
  { value: "alta",    label: "Alta — interferindo na produção"   },
  { value: "critica", label: "Crítica — parada total"            },
];

export default function EquipamentoPublico() {
  const { id } = useParams<{ id: string }>();
  const [enviado, setEnviado] = useState(false);
  const [form, setForm] = useState({ descricao: "", urgencia: "media", solicitante_nome: "", solicitante_contato: "" });

  const { data: equipamento, isLoading, error } = useQuery({
    queryKey: ["equipamento_publico", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("equipamentos").select("id, nome, codigo, localizacao, grupo").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const enviar = useMutation({
    mutationFn: async () => {
      if (!form.descricao.trim()) throw new Error("Descreva o problema");
      const { error } = await supabase.from("solicitacoes_servico").insert({
        equipamento_id: id,
        descricao: form.descricao.trim(),
        urgencia: form.urgencia,
        solicitante_nome: form.solicitante_nome.trim() || null,
        solicitante_contato: form.solicitante_contato.trim() || null,
        status: "pendente",
      });
      if (error) throw error;
    },
    onSuccess: () => setEnviado(true),
  });

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground text-sm">Carregando...</p>
    </div>
  );

  if (error || !equipamento) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center space-y-3">
        <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
        <h1 className="text-lg font-semibold">Equipamento não encontrado</h1>
        <p className="text-sm text-muted-foreground">Verifique o QR Code e tente novamente.</p>
      </div>
    </div>
  );

  if (enviado) return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center space-y-4 max-w-sm">
        <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="text-xl font-bold">Solicitação enviada!</h1>
        <p className="text-sm text-muted-foreground">
          Sua solicitação foi registrada para <strong>{equipamento.nome}</strong>. A equipe de manutenção será notificada.
        </p>
        <button onClick={() => { setEnviado(false); setForm({ descricao: "", urgencia: "media", solicitante_nome: "", solicitante_contato: "" }); }}
          className="rounded-md border px-6 py-2 text-sm hover:bg-muted transition-colors">
          Nova solicitação
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center mx-auto">
            <Wrench className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold">MGM —Solicitação de Serviço</h1>
        </div>

        {/* Equipamento */}
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{equipamento.nome}</h2>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{equipamento.codigo}</span>
          </div>
          {equipamento.localizacao && <p className="text-sm text-muted-foreground">📍 {equipamento.localizacao}</p>}
          {equipamento.grupo && <p className="text-sm text-muted-foreground">Grupo: {equipamento.grupo}</p>}
        </div>

        {/* Formulário */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Descreva o problema *</label>
            <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
              rows={4} placeholder="O que está acontecendo com o equipamento?"
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Urgência</label>
            <select value={form.urgencia} onChange={e => setForm(f => ({ ...f, urgencia: e.target.value }))}
              className="w-full rounded-md border px-3 py-2 text-sm outline-none bg-background">
              {URGENCIA.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Seu nome</label>
              <input value={form.solicitante_nome} onChange={e => setForm(f => ({ ...f, solicitante_nome: e.target.value }))}
                placeholder="Opcional"
                className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Contato</label>
              <input value={form.solicitante_contato} onChange={e => setForm(f => ({ ...f, solicitante_contato: e.target.value }))}
                placeholder="Ramal ou tel."
                className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          {enviar.isError && (
            <p className="text-sm text-destructive">{(enviar.error as Error).message}</p>
          )}
          <button onClick={() => enviar.mutate()}
            disabled={!form.descricao.trim() || enviar.isPending}
            className="w-full rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {enviar.isPending ? "Enviando..." : "Enviar solicitação"}
          </button>
        </div>
      </div>
    </div>
  );
}