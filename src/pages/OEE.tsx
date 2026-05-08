import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Activity, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const hoje = new Date().toISOString().split("T")[0];

const FORM_VAZIO = {
  equipamento_id: "", data: hoje, turno: "Geral",
  tempo_disponivel_min: "480", tempo_parado_min: "0",
  producao_realizada: "", producao_planejada: "", producao_aprovada: "", observacao: "",
};

function OEEGauge({ value, label, color }: { value: number; label: string; color: string }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="text-center">
      <div className="relative h-24 w-24 mx-auto">
        <svg viewBox="0 0 100 100" className="transform -rotate-90">
          <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
          <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={`${pct * 2.51} 251`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold">{pct}%</span>
        </div>
      </div>
      <p className="text-sm font-medium mt-1">{label}</p>
    </div>
  );
}

export default function OEE() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);

  const { data: registros = [], isLoading } = useQuery({
    queryKey: ["vw_oee"],
    queryFn: async () => {
      const { data } = await supabase.from("vw_oee").select("*").order("data", { ascending: false }).limit(50);
      return data as any[] || [];
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
      if (!form.equipamento_id) throw new Error("Selecione o equipamento");
      if (!form.producao_planejada || !form.producao_realizada || !form.producao_aprovada)
        throw new Error("Preencha os dados de produção");
      const { error } = await supabase.from("oee_registros").insert({
        equipamento_id: form.equipamento_id,
        data: form.data,
        turno: form.turno,
        tempo_disponivel_min: Number(form.tempo_disponivel_min),
        tempo_parado_min: Number(form.tempo_parado_min),
        producao_realizada: Number(form.producao_realizada),
        producao_planejada: Number(form.producao_planejada),
        producao_aprovada: Number(form.producao_aprovada),
        observacao: form.observacao || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vw_oee"] });
      toast.success("Registro salvo!");
      setOpen(false); setForm(FORM_VAZIO);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("oee_registros").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vw_oee"] }); toast.success("Excluído!"); },
  });

  const oeeMedia = registros.length ? Math.round(registros.reduce((a: number, r: any) => a + Number(r.oee_pct || 0), 0) / registros.length) : 0;
  const dispMedia = registros.length ? Math.round(registros.reduce((a: number, r: any) => a + Number(r.disponibilidade_pct || 0), 0) / registros.length) : 0;
  const desempMedia = registros.length ? Math.round(registros.reduce((a: number, r: any) => a + Number(r.desempenho_pct || 0), 0) / registros.length) : 0;
  const qualMedia = registros.length ? Math.round(registros.reduce((a: number, r: any) => a + Number(r.qualidade_pct || 0), 0) / registros.length) : 0;

  const chartData = registros.slice(0, 10).reverse().map((r: any) => ({
    label: `${r.equipamento} ${new Date(r.data + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`,
    OEE: Number(r.oee_pct || 0),
    Disponibilidade: Number(r.disponibilidade_pct || 0),
    Desempenho: Number(r.desempenho_pct || 0),
    Qualidade: Number(r.qualidade_pct || 0),
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">OEE — Eficiência Global</h1>
          <p className="text-sm text-muted-foreground">Overall Equipment Effectiveness</p>
        </div>
        <button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" />Novo registro
        </button>
      </div>

      {/* Gauges */}
      <div className="kpi-card">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><Activity className="h-4 w-4" />Médias gerais</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <OEEGauge value={oeeMedia} label="OEE" color="hsl(221, 83%, 53%)" />
          <OEEGauge value={dispMedia} label="Disponibilidade" color="hsl(142, 71%, 45%)" />
          <OEEGauge value={desempMedia} label="Desempenho" color="hsl(38, 92%, 50%)" />
          <OEEGauge value={qualMedia} label="Qualidade" color="hsl(280, 65%, 60%)" />
        </div>
      </div>

      {/* Gráfico */}
      {chartData.length > 0 && (
        <div className="kpi-card">
          <h3 className="font-semibold mb-4">Histórico OEE</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: any) => v + "%"} />
              <Legend />
              <Bar dataKey="OEE" fill="hsl(221, 83%, 53%)" radius={[4,4,0,0]} />
              <Bar dataKey="Disponibilidade" fill="hsl(142, 71%, 45%)" radius={[4,4,0,0]} />
              <Bar dataKey="Desempenho" fill="hsl(38, 92%, 50%)" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabela */}
      <div className="kpi-card">
        <h3 className="font-semibold mb-4">Registros recentes</h3>
        {isLoading ? <p className="text-center text-muted-foreground py-4 text-sm">Carregando...</p> :
          registros.length === 0 ? <p className="text-center text-muted-foreground py-4 text-sm">Nenhum registro.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium text-muted-foreground">Equipamento</th>
                    <th className="text-left py-2 font-medium text-muted-foreground hidden sm:table-cell">Data</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Disp.</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Desemp.</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Qual.</th>
                    <th className="text-right py-2 font-medium text-muted-foreground font-bold">OEE</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {registros.map((r: any) => (
                    <tr key={r.equipamento_id + r.data} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-2 font-medium">{r.equipamento}</td>
                      <td className="py-2 hidden sm:table-cell text-muted-foreground">{new Date(r.data + "T12:00:00").toLocaleDateString("pt-BR")}</td>
                      <td className="py-2 text-right text-muted-foreground">{r.disponibilidade_pct}%</td>
                      <td className="py-2 text-right text-muted-foreground">{r.desempenho_pct}%</td>
                      <td className="py-2 text-right text-muted-foreground">{r.qualidade_pct}%</td>
                      <td className={`py-2 text-right font-bold ${Number(r.oee_pct) >= 85 ? "text-green-600" : Number(r.oee_pct) >= 60 ? "text-amber-600" : "text-red-600"}`}>{r.oee_pct}%</td>
                      <td className="py-2">
                        <button onClick={() => { if (confirm("Excluir?")) remove.mutate(r.id); }} className="p-1 rounded hover:bg-muted">
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-card border shadow-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold">Novo Registro OEE</h2>
            <div className="space-y-3">
              <div><label className="text-sm font-medium">Equipamento *</label>
                <select value={form.equipamento_id} onChange={e => setForm(f => ({ ...f, equipamento_id: e.target.value }))} className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none bg-background">
                  <option value="">Selecione...</option>
                  {equipamentos.map((eq: any) => <option key={eq.id} value={eq.id}>{eq.nome} ({eq.codigo})</option>)}
                </select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium">Data</label>
                  <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" /></div>
                <div><label className="text-sm font-medium">Turno</label>
                  <select value={form.turno} onChange={e => setForm(f => ({ ...f, turno: e.target.value }))} className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none bg-background">
                    <option value="Geral">Geral</option>
                    <option value="A">Turno A</option>
                    <option value="B">Turno B</option>
                    <option value="C">Turno C</option>
                  </select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium">Tempo disponível (min)</label>
                  <input type="number" value={form.tempo_disponivel_min} onChange={e => setForm(f => ({ ...f, tempo_disponivel_min: e.target.value }))} className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" /></div>
                <div><label className="text-sm font-medium">Tempo parado (min)</label>
                  <input type="number" value={form.tempo_parado_min} onChange={e => setForm(f => ({ ...f, tempo_parado_min: e.target.value }))} className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-sm font-medium">Prod. planejada</label>
                  <input type="number" value={form.producao_planejada} onChange={e => setForm(f => ({ ...f, producao_planejada: e.target.value }))} className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" /></div>
                <div><label className="text-sm font-medium">Prod. realizada</label>
                  <input type="number" value={form.producao_realizada} onChange={e => setForm(f => ({ ...f, producao_realizada: e.target.value }))} className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" /></div>
                <div><label className="text-sm font-medium">Prod. aprovada</label>
                  <input type="number" value={form.producao_aprovada} onChange={e => setForm(f => ({ ...f, producao_aprovada: e.target.value }))} className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" /></div>
              </div>
              <div><label className="text-sm font-medium">Observação</label>
                <textarea value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} rows={2} className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none" /></div>
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