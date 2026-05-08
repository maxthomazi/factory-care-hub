import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Wrench, Clock, DollarSign, TrendingUp, Package } from "lucide-react";
import { cn } from "@/lib/utils";

const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const STATUS_CFG: Record<string, string> = {
  "Aberta":       "bg-amber-100 text-amber-700",
  "Em Andamento": "bg-blue-100 text-blue-700",
  "Finalizada":   "bg-green-100 text-green-700",
  "Cancelada":    "bg-slate-100 text-slate-600",
};

export default function EquipamentoHistorico() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: equipamento } = useQuery({
    queryKey: ["equipamento", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("equipamentos").select("*").eq("id", id!).single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
  });

  const { data: ordens = [], isLoading } = useQuery({
    queryKey: ["historico_os", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ordens_servico")
        .select("*, funcionarios:responsavel_id(nome), os_pecas(quantidade, pecas(nome, valor_unitario)), os_tecnicos(horas, funcionarios(nome, salario_mensal))")
        .eq("equipamento_id", id!)
        .order("data_abertura", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!id,
  });

  const { data: custo } = useQuery({
    queryKey: ["custo_equipamento", id],
    queryFn: async () => {
      const { data } = await supabase.from("vw_custo_por_equipamento").select("*").eq("equipamento_id", id!).single();
      return data as any;
    },
    enabled: !!id,
  });

  const totalOS = ordens.length;
  const osFinalizadas = ordens.filter(o => o.status === "Finalizada").length;
  const finalizadas = ordens.filter(o => o.data_fechamento && o.status === "Finalizada");
  let mttr = 0;
  if (finalizadas.length > 0) {
    const totalH = finalizadas.reduce((acc, os) => {
      const h = (new Date(os.data_fechamento).getTime() - new Date(os.data_abertura).getTime()) / 3600000;
      return acc + Math.max(0, h);
    }, 0);
    mttr = Math.round((totalH / finalizadas.length) * 10) / 10;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/equipamentos")} className="p-2 rounded-lg border hover:bg-muted transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold">{equipamento?.nome || "Carregando..."}</h1>
          <p className="text-sm text-muted-foreground">{equipamento?.codigo} · Histórico completo</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="kpi-card">
          <div className="flex items-center gap-2 mb-2">
            <Wrench className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-medium text-muted-foreground uppercase">Total OS</span>
          </div>
          <p className="text-2xl font-bold">{totalOS}</p>
        </div>
        <div className="kpi-card">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="text-xs font-medium text-muted-foreground uppercase">Finalizadas</span>
          </div>
          <p className="text-2xl font-bold">{osFinalizadas}</p>
        </div>
        <div className="kpi-card">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-amber-500" />
            <span className="text-xs font-medium text-muted-foreground uppercase">MTTR</span>
          </div>
          <p className="text-2xl font-bold">{mttr}h</p>
        </div>
        <div className="kpi-card">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-amber-500" />
            <span className="text-xs font-medium text-muted-foreground uppercase">Custo total</span>
          </div>
          <p className="text-2xl font-bold">{fmt(custo?.custo_total || 0)}</p>
        </div>
      </div>

      {/* Timeline de OS */}
      <div className="kpi-card">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Wrench className="h-4 w-4" />Ordens de Serviço
        </h3>
        {isLoading ? <p className="text-center text-muted-foreground py-4 text-sm">Carregando...</p> :
          ordens.length === 0 ? <p className="text-center text-muted-foreground py-4 text-sm">Nenhuma OS registrada.</p> : (
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
              <div className="space-y-4">
                {ordens.map((os: any) => {
                  const custoPecas = (os.os_pecas || []).reduce((a: number, p: any) => a + (p.quantidade * (p.pecas?.valor_unitario || 0)), 0);
                  const custoMO = (os.os_tecnicos || []).reduce((a: number, t: any) => a + (t.horas * ((t.funcionarios?.salario_mensal || 0) / 176)), 0);
                  return (
                    <div key={os.id} className="flex gap-4 pl-10 relative">
                      <div className="absolute left-2.5 top-2 h-3 w-3 rounded-full border-2 border-primary bg-card" />
                      <div className="flex-1 rounded-lg border bg-muted/30 p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium">{os.descricao}</p>
                          <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", STATUS_CFG[os.status] || "bg-slate-100 text-slate-600")}>
                            {os.status}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          {os.data_abertura && (
                            <span>📅 {new Date(os.data_abertura + "T12:00:00").toLocaleDateString("pt-BR")}</span>
                          )}
                          {os.data_fechamento && (
                            <span>✅ {new Date(os.data_fechamento + "T12:00:00").toLocaleDateString("pt-BR")}</span>
                          )}
                          {os.funcionarios?.nome && <span>👤 {os.funcionarios.nome}</span>}
                        </div>
                        {os.solucao && (
                          <p className="text-xs text-muted-foreground italic">"{os.solucao}"</p>
                        )}
                        {(custoPecas > 0 || custoMO > 0) && (
                          <div className="flex gap-3 pt-1 border-t text-xs">
                            {custoPecas > 0 && (
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <Package className="h-3 w-3" />Peças: {fmt(custoPecas)}
                              </span>
                            )}
                            {custoMO > 0 && (
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <Clock className="h-3 w-3" />M.O.: {fmt(custoMO)}
                              </span>
                            )}
                            <span className="font-medium">Total: {fmt(custoPecas + custoMO)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
      </div>
    </div>
  );
}