import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart2, Download, TrendingUp, Wrench, DollarSign, Clock } from "lucide-react";

const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

function exportCSV(data: any[], filename: string) {
  if (!data.length) return;
  const keys = Object.keys(data[0]);
  const csv = [keys.join(","), ...data.map(row => keys.map(k => `"${row[k] ?? ""}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename + ".csv"; a.click();
  URL.revokeObjectURL(url);
}

export default function Relatorios() {
  const { data: custos = [] } = useQuery({
    queryKey: ["vw_custo_por_equipamento"],
    queryFn: async () => {
      const { data } = await supabase.from("vw_custo_por_equipamento").select("*").order("custo_total", { ascending: false });
      return data as any[] || [];
    },
  });

  const { data: disponibilidade = [] } = useQuery({
    queryKey: ["vw_disponibilidade"],
    queryFn: async () => {
      const { data } = await supabase.from("vw_disponibilidade").select("*").order("disponibilidade_pct");
      return data as any[] || [];
    },
  });

  const { data: ordens = [] } = useQuery({
    queryKey: ["ordens_relatorio"],
    queryFn: async () => {
      const { data } = await supabase.from("ordens_servico").select("*, equipamentos(nome), funcionarios:responsavel_id(nome)").order("data_abertura", { ascending: false });
      return data as any[] || [];
    },
  });

  const totalCusto = custos.reduce((a: number, c: any) => a + Number(c.custo_total || 0), 0);
  const totalOS = ordens.length;
  const osFinalizadas = ordens.filter((o: any) => o.status === "Finalizada").length;
  const dispMedia = disponibilidade.length ? Math.round(disponibilidade.reduce((a: number, d: any) => a + Number(d.disponibilidade_pct || 0), 0) / disponibilidade.length) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Relatórios</h1>
          <p className="text-sm text-muted-foreground">Indicadores e exportações</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Custo total", value: fmt(totalCusto), icon: DollarSign, color: "text-amber-500" },
          { title: "Total de OS", value: totalOS, icon: Wrench, color: "text-blue-500" },
          { title: "OS finalizadas", value: osFinalizadas, icon: TrendingUp, color: "text-green-500" },
          { title: "Disponibilidade média", value: dispMedia + "%", icon: Clock, color: "text-primary" },
        ].map(kpi => (
          <div key={kpi.title} className="kpi-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{kpi.title}</span>
              <kpi.icon className={"h-4 w-4 " + kpi.color} />
            </div>
            <p className="text-2xl font-bold">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Custo por equipamento */}
      <div className="kpi-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2"><BarChart2 className="h-4 w-4" />Custo por equipamento</h3>
          <button onClick={() => exportCSV(custos, "custo_por_equipamento")} className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs hover:bg-muted">
            <Download className="h-3.5 w-3.5" />Exportar CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 font-medium text-muted-foreground">Equipamento</th>
                <th className="text-right py-2 font-medium text-muted-foreground">OS Total</th>
                <th className="text-right py-2 font-medium text-muted-foreground">Custo Peças</th>
                <th className="text-right py-2 font-medium text-muted-foreground">Custo M.O.</th>
                <th className="text-right py-2 font-medium text-muted-foreground">Total</th>
              </tr>
            </thead>
            <tbody>
              {custos.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Nenhum dado.</td></tr>
              ) : custos.map((c: any) => (
                <tr key={c.equipamento_id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="py-2 font-medium">{c.equipamento}</td>
                  <td className="py-2 text-right text-muted-foreground">{c.total_os}</td>
                  <td className="py-2 text-right text-muted-foreground">{fmt(c.custo_pecas || 0)}</td>
                  <td className="py-2 text-right text-muted-foreground">{fmt(c.custo_mao_obra || 0)}</td>
                  <td className="py-2 text-right font-semibold">{fmt(c.custo_total || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Disponibilidade */}
      <div className="kpi-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2"><Clock className="h-4 w-4" />Disponibilidade por equipamento (30 dias)</h3>
          <button onClick={() => exportCSV(disponibilidade, "disponibilidade")} className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs hover:bg-muted">
            <Download className="h-3.5 w-3.5" />Exportar CSV
          </button>
        </div>
        <div className="space-y-3">
          {disponibilidade.length === 0 ? <p className="text-center text-muted-foreground py-4 text-sm">Nenhum dado.</p> :
            disponibilidade.map((d: any) => (
              <div key={d.equipamento_id} className="flex items-center gap-3">
                <span className="text-sm w-40 truncate font-medium">{d.equipamento}</span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${Number(d.disponibilidade_pct) >= 90 ? "bg-green-500" : Number(d.disponibilidade_pct) >= 70 ? "bg-amber-500" : "bg-red-500"}`}
                    style={{ width: d.disponibilidade_pct + "%" }} />
                </div>
                <span className={`text-sm font-semibold w-12 text-right ${Number(d.disponibilidade_pct) >= 90 ? "text-green-600" : Number(d.disponibilidade_pct) >= 70 ? "text-amber-600" : "text-red-600"}`}>
                  {d.disponibilidade_pct}%
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* Lista de OS */}
      <div className="kpi-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2"><Wrench className="h-4 w-4" />Ordens de Serviço</h3>
          <button onClick={() => exportCSV(ordens.map((o: any) => ({ equipamento: o.equipamentos?.nome, descricao: o.descricao, status: o.status, responsavel: o.funcionarios?.nome, data_abertura: o.data_abertura, data_fechamento: o.data_fechamento || "" })), "ordens_servico")}
            className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs hover:bg-muted">
            <Download className="h-3.5 w-3.5" />Exportar CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 font-medium text-muted-foreground">Equipamento</th>
                <th className="text-left py-2 font-medium text-muted-foreground hidden md:table-cell">Descrição</th>
                <th className="text-left py-2 font-medium text-muted-foreground">Status</th>
                <th className="text-left py-2 font-medium text-muted-foreground hidden sm:table-cell">Responsável</th>
                <th className="text-left py-2 font-medium text-muted-foreground hidden lg:table-cell">Abertura</th>
              </tr>
            </thead>
            <tbody>
              {ordens.slice(0, 20).map((o: any) => (
                <tr key={o.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="py-2 font-medium">{o.equipamentos?.nome || "—"}</td>
                  <td className="py-2 hidden md:table-cell text-muted-foreground truncate max-w-[200px]">{o.descricao}</td>
                  <td className="py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${o.status === "Finalizada" ? "bg-green-100 text-green-700" : o.status === "Aberta" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>{o.status}</span>
                  </td>
                  <td className="py-2 hidden sm:table-cell text-muted-foreground">{o.funcionarios?.nome || "—"}</td>
                  <td className="py-2 hidden lg:table-cell text-muted-foreground">{o.data_abertura ? new Date(o.data_abertura + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}