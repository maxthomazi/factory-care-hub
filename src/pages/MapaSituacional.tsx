import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Wrench, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_CFG: Record<string, { label: string; color: string; icon: any }> = {
  operando:       { label: "Operando",       color: "bg-green-100 text-green-700 border-green-200",  icon: CheckCircle2  },
  em_manutencao:  { label: "Em Manutenção",  color: "bg-amber-100 text-amber-700 border-amber-200",  icon: Wrench        },
  parado:         { label: "Parado",         color: "bg-red-100 text-red-700 border-red-200",         icon: AlertTriangle },
  inativo:        { label: "Inativo",        color: "bg-slate-100 text-slate-600 border-slate-200",   icon: MapPin        },
};

export default function MapaSituacional() {
  const { data: equipamentos = [], isLoading } = useQuery({
    queryKey: ["equipamentos_mapa"],
    queryFn: async () => {
      const { data, error } = await supabase.from("equipamentos").select("*").order("localizacao").order("nome");
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: osAbertas = [] } = useQuery({
    queryKey: ["os_abertas_mapa"],
    queryFn: async () => {
      const { data } = await supabase.from("ordens_servico").select("equipamento_id, status").in("status", ["Aberta", "Em Andamento"]);
      return data as any[] || [];
    },
  });

  const osAbertasPorEquip = new Set(osAbertas.map((os: any) => os.equipamento_id));

  // Agrupar por localização
  const grupos: Record<string, any[]> = {};
  equipamentos.forEach((eq: any) => {
    const loc = eq.localizacao || "Sem localização";
    if (!grupos[loc]) grupos[loc] = [];
    grupos[loc].push(eq);
  });

  const totalOperando = equipamentos.filter((e: any) => e.status === "operando").length;
  const totalManutencao = equipamentos.filter((e: any) => e.status === "em_manutencao").length;
  const totalParado = equipamentos.filter((e: any) => e.status === "parado").length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Mapa Situacional</h1>
          <p className="text-sm text-muted-foreground">Status dos equipamentos por localização</p>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-4">
        <div className="kpi-card border-green-200">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-xs font-medium text-muted-foreground uppercase">Operando</span>
          </div>
          <p className="text-3xl font-bold text-green-600">{totalOperando}</p>
        </div>
        <div className="kpi-card border-amber-200">
          <div className="flex items-center gap-2 mb-1">
            <Wrench className="h-4 w-4 text-amber-500" />
            <span className="text-xs font-medium text-muted-foreground uppercase">Manutenção</span>
          </div>
          <p className="text-3xl font-bold text-amber-600">{totalManutencao}</p>
        </div>
        <div className="kpi-card border-red-200">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-xs font-medium text-muted-foreground uppercase">Parado</span>
          </div>
          <p className="text-3xl font-bold text-red-600">{totalParado}</p>
        </div>
      </div>

      {isLoading ? <p className="text-center text-muted-foreground py-8 text-sm">Carregando...</p> :
        Object.keys(grupos).length === 0 ? <p className="text-center text-muted-foreground py-8 text-sm">Nenhum equipamento cadastrado.</p> : (
          <div className="space-y-6">
            {Object.entries(grupos).map(([loc, eqs]) => (
              <div key={loc}>
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <h2 className="font-semibold">{loc}</h2>
                  <span className="text-xs text-muted-foreground">({eqs.length} equipamento{eqs.length !== 1 ? "s" : ""})</span>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {eqs.map((eq: any) => {
                    const cfg = STATUS_CFG[eq.status] || STATUS_CFG.inativo;
                    const temOS = osAbertasPorEquip.has(eq.id);
                    const Icon = cfg.icon;
                    return (
                      <div key={eq.id} className={cn("rounded-lg border p-3 space-y-2 transition-all hover:shadow-sm", temOS && "ring-2 ring-amber-400")}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{eq.nome}</p>
                            <p className="text-xs text-muted-foreground">{eq.codigo}</p>
                          </div>
                          {eq.criticidade && (
                            <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-xs font-bold border",
                              eq.criticidade === "A" ? "bg-red-100 text-red-700 border-red-200" :
                              eq.criticidade === "B" ? "bg-amber-100 text-amber-700 border-amber-200" :
                              "bg-green-100 text-green-700 border-green-200")}>
                              {eq.criticidade}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={cn("flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium", cfg.color)}>
                            <Icon className="h-3 w-3" />{cfg.label}
                          </span>
                          {temOS && (
                            <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                              <Wrench className="h-3 w-3" />OS aberta
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}