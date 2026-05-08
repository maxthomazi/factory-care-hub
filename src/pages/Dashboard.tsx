import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Wrench, AlertTriangle, TrendingUp, DollarSign, ClipboardList, BarChart2, Bell } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";

const PIE_COLORS = ["hsl(205, 85%, 50%)", "hsl(38, 92%, 50%)"];
const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

function calcularDashboard(ordens: any[]) {
  const agora = new Date();
  const mesAtual = agora.getMonth();
  const anoAtual = agora.getFullYear();
  const doMes = ordens.filter(os => {
    const d = new Date(os.data_abertura);
    return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
  });
  const osAbertasMes = doMes.filter(os => ["Aberta","aberta","Em Andamento"].includes(os.status)).length;
  const osFinalizadasMes = doMes.filter(os => ["Finalizada","finalizada"].includes(os.status)).length;
  const totalTipadas = ordens.filter(os => os.tipo).length || 1;
  const preventivas = ordens.filter(os => ["preventiva","Preventiva"].includes(os.tipo)).length;
  const preventivaPct = Math.round((preventivas / totalTipadas) * 100);
  const finalizadas = ordens.filter(os => os.data_fechamento && ["Finalizada","finalizada"].includes(os.status));
  let mttr = 0;
  if (finalizadas.length > 0) {
    const totalHoras = finalizadas.reduce((acc, os) => {
      const h = (new Date(os.data_fechamento).getTime() - new Date(os.data_abertura).getTime()) / 3600000;
      return acc + Math.max(0, h);
    }, 0);
    mttr = Math.round((totalHoras / finalizadas.length) * 10) / 10;
  }
  const corretivas = ordens.filter(os => ["corretiva","Corretiva"].includes(os.tipo || "")).length;
  const mtbf = corretivas > 0 ? Math.round((30 * 24) / corretivas) : 0;
  const osPorMes = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(anoAtual, mesAtual - 5 + i, 1);
    const m = d.getMonth(); const a = d.getFullYear();
    const doMesI = ordens.filter(os => {
      const od = new Date(os.data_abertura);
      return od.getMonth() === m && od.getFullYear() === a;
    });
    return {
      mes: MESES[m],
      preventiva: doMesI.filter(os => ["preventiva","Preventiva"].includes(os.tipo)).length,
      corretiva: doMesI.filter(os => ["corretiva","Corretiva"].includes(os.tipo || "")).length,
    };
  });
  const contadorEq: Record<string, { nome: string; falhas: number }> = {};
  ordens.forEach(os => {
    const nome = os.equipamentos?.nome ?? "Desconhecido";
    const id = os.equipamento_id ?? nome;
    if (!contadorEq[id]) contadorEq[id] = { nome, falhas: 0 };
    contadorEq[id].falhas += 1;
  });
  const equipamentosFalhas = Object.values(contadorEq).sort((a, b) => b.falhas - a.falhas).slice(0, 5);
  return { mtbf, mttr, osAbertasMes, osFinalizadasMes, preventivaPct, corretivaPct: 100 - preventivaPct, osPorMes, equipamentosFalhas };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: ordens = [], isLoading } = useQuery({
    queryKey: ["ordens_servico"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ordens_servico").select("*, equipamentos(nome)").order("data_abertura", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
  const { data: custosMes = [] } = useQuery({
    queryKey: ["vw_custo_por_equipamento"],
    queryFn: async () => {
      const { data } = await supabase.from("vw_custo_por_equipamento").select("*");
      return data as any[] || [];
    },
  });
  const { data: solicitacoesPendentes = [] } = useQuery({
    queryKey: ["solicitacoes_dash"],
    queryFn: async () => {
      const { data } = await supabase.from("solicitacoes_servico").select("id, descricao, urgencia, created_at, equipamentos(nome)").eq("status", "pendente").order("created_at", { ascending: false }).limit(5);
      return data as any[] || [];
    },
  });
  const { data: equipCriticos = [] } = useQuery({
    queryKey: ["equip_criticos_dash"],
    queryFn: async () => {
      const { data } = await supabase.from("equipamentos").select("id, nome, codigo, criticidade, status").eq("criticidade", "A").limit(5);
      return data as any[] || [];
    },
  });

  const custoTotal = custosMes.reduce((a, c) => a + Number(c.custo_total || 0), 0);
  const dash = calcularDashboard(ordens);
  const pieData = [{ name: "Preventiva", value: dash.preventivaPct }, { name: "Corretiva", value: dash.corretivaPct }];
  const recentOS = ordens.slice(0, 5);
  const urgenciaConfig: Record<string, string> = { critica: "bg-red-100 text-red-800", alta: "bg-amber-100 text-amber-800", media: "bg-blue-100 text-blue-700", baixa: "bg-slate-100 text-slate-600" };

  if (isLoading) return <div className="space-y-6"><h1 className="page-title">Dashboard</h1><p className="text-center text-muted-foreground py-16">Carregando...</p></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <button onClick={() => navigate("/relatorios")} className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-muted transition-colors">
          <BarChart2 className="h-4 w-4" />Ver relatórios
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { title: "MTBF", value: dash.mtbf + "h", sub: "Entre falhas", icon: Clock, color: "text-blue-500" },
          { title: "MTTR", value: dash.mttr + "h", sub: "Tempo de reparo", icon: Wrench, color: "text-amber-500" },
          { title: "OS Abertas", value: dash.osAbertasMes, sub: "Este mês", icon: ClipboardList, color: "text-destructive" },
          { title: "OS Finalizadas", value: dash.osFinalizadasMes, sub: "Este mês", icon: TrendingUp, color: "text-green-500" },
          { title: "Preventiva", value: dash.preventivaPct + "%", sub: "vs Corretiva", icon: AlertTriangle, color: "text-primary" },
          { title: "Custo Total", value: fmt(custoTotal), sub: "Peças + M.O.", icon: DollarSign, color: "text-amber-500" },
        ].map(kpi => (
          <div key={kpi.title} className="kpi-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{kpi.title}</span>
              <kpi.icon className={"h-4 w-4 " + kpi.color} />
            </div>
            <p className="text-2xl font-bold">{kpi.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {(solicitacoesPendentes.length > 0 || equipCriticos.length > 0) && (
        <div className="grid lg:grid-cols-2 gap-4">
          {solicitacoesPendentes.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-amber-600" />
                  <h3 className="text-sm font-semibold text-amber-800">{solicitacoesPendentes.length} solicitação(ões) pendente(s)</h3>
                </div>
                <button onClick={() => navigate("/solicitacoes")} className="text-xs text-amber-700 hover:underline">Ver todas</button>
              </div>
              <div className="space-y-2">
                {solicitacoesPendentes.map((s: any) => (
                  <div key={s.id} className="flex items-center gap-2 text-sm">
                    <span className={"rounded-full px-2 py-0.5 text-xs font-medium " + (urgenciaConfig[s.urgencia] || urgenciaConfig.media)}>{s.urgencia}</span>
                    <span className="truncate text-amber-900">{s.equipamentos?.nome || "—"}: {s.descricao}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {equipCriticos.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <h3 className="text-sm font-semibold text-red-800">Equipamentos críticos A</h3>
                </div>
                <button onClick={() => navigate("/equipamentos")} className="text-xs text-red-700 hover:underline">Ver todos</button>
              </div>
              <div className="space-y-2">
                {equipCriticos.map((eq: any) => (
                  <div key={eq.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-red-900 truncate">{eq.nome}</span>
                    <span className={"rounded-full px-2 py-0.5 text-xs " + (eq.status === "operando" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")}>{eq.status || "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 kpi-card">
          <h3 className="text-sm font-semibold mb-4">OS por mês</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={dash.osPorMes}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="preventiva" name="Preventiva" fill="hsl(205, 85%, 50%)" radius={[4,4,0,0]} />
              <Bar dataKey="corretiva" name="Corretiva" fill="hsl(38, 92%, 50%)" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="kpi-card flex flex-col items-center">
          <h3 className="text-sm font-semibold mb-4 self-start">Preventiva vs Corretiva</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}%`}>
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="kpi-card">
          <h3 className="text-sm font-semibold mb-4">Equipamentos com mais OS</h3>
          {dash.equipamentosFalhas.length === 0 ? <p className="text-muted-foreground text-sm">Sem dados.</p> : (
            <div className="space-y-3">
              {dash.equipamentosFalhas.map((eq, i) => (
                <div key={eq.nome} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{eq.nome}</span>
                      <span className="text-muted-foreground">{eq.falhas} OS</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: (eq.falhas / (dash.equipamentosFalhas[0]?.falhas || 1) * 100) + "%" }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="kpi-card">
          <h3 className="text-sm font-semibold mb-4">Últimas OS</h3>
          {recentOS.length === 0 ? <p className="text-muted-foreground text-sm">Nenhuma OS.</p> : (
            <div className="space-y-3">
              {recentOS.map((os: any) => (
                <div key={os.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{os.equipamentos?.nome ?? "—"}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[250px]">{os.descricao}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${os.status === "Finalizada" ? "bg-green-100 text-green-700" : os.status === "Aberta" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>{os.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}