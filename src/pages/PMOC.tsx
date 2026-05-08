import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DIAS_SEMANA = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

const SITUACAO_CFG: Record<string, { label: string; color: string }> = {
  vencida:  { label: "Vencida",  color: "bg-red-100 text-red-700 border-red-200"       },
  urgente:  { label: "Urgente",  color: "bg-amber-100 text-amber-700 border-amber-200" },
  proxima:  { label: "Próxima",  color: "bg-blue-100 text-blue-700 border-blue-200"    },
  ok:       { label: "OK",       color: "bg-green-100 text-green-700 border-green-200" },
};

export default function PMOC() {
  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getMonth());
  const [ano, setAno] = useState(hoje.getFullYear());

  const { data: preventivas = [], isLoading } = useQuery({
    queryKey: ["vw_pmoc"],
    queryFn: async () => {
      const { data } = await supabase.from("vw_pmoc").select("*");
      return data as any[] || [];
    },
  });

  function prevMes() {
    if (mes === 0) { setMes(11); setAno(a => a - 1); }
    else setMes(m => m - 1);
  }

  function nextMes() {
    if (mes === 11) { setMes(0); setAno(a => a + 1); }
    else setMes(m => m + 1);
  }

  const doMes = preventivas.filter(p => p.mes_execucao === mes + 1 && p.ano_execucao === ano);
  const primeiroDia = new Date(ano, mes, 1).getDay();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();

  const eventosPorDia: Record<number, any[]> = {};
  doMes.forEach(p => {
    if (p.proxima_data) {
      const dia = new Date(p.proxima_data + "T12:00:00").getDate();
      if (!eventosPorDia[dia]) eventosPorDia[dia] = [];
      eventosPorDia[dia].push(p);
    }
  });

  const cells = [];
  for (let i = 0; i < primeiroDia; i++) cells.push(null);
  for (let d = 1; d <= diasNoMes; d++) cells.push(d);

  const resumo = { vencida: 0, urgente: 0, proxima: 0, ok: 0 };
  doMes.forEach(p => { if (p.situacao in resumo) resumo[p.situacao as keyof typeof resumo]++; });

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">PMOC — Calendário</h1>
          <p className="text-sm text-muted-foreground">Plano de Manutenção, Operação e Controle</p>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-4 gap-3">
        {Object.entries(resumo).map(([key, count]) => {
          const cfg = SITUACAO_CFG[key];
          return (
            <div key={key} className={cn("rounded-lg border px-3 py-2 text-center", cfg.color)}>
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-xs font-medium">{cfg.label}</p>
            </div>
          );
        })}
      </div>

      {/* Navegação */}
      <div className="flex items-center justify-between">
        <button onClick={prevMes} className="p-2 rounded-lg border hover:bg-muted transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h2 className="text-lg font-semibold">{MESES[mes]} {ano}</h2>
        <button onClick={nextMes} className="p-2 rounded-lg border hover:bg-muted transition-colors">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Calendário */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="grid grid-cols-7 border-b">
          {DIAS_SEMANA.map(d => (
            <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((dia, i) => {
            const eventos = dia ? (eventosPorDia[dia] || []) : [];
            const isHoje = dia === hoje.getDate() && mes === hoje.getMonth() && ano === hoje.getFullYear();
            return (
              <div key={i} className={cn("min-h-[80px] border-r border-b p-1.5", !dia && "bg-muted/30", i % 7 === 6 && "border-r-0")}>
                {dia && (
                  <>
                    <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium mb-1",
                      isHoje ? "bg-primary text-primary-foreground" : "text-foreground")}>
                      {dia}
                    </span>
                    <div className="space-y-0.5">
                      {eventos.slice(0, 2).map((ev, j) => {
                        const cfg = SITUACAO_CFG[ev.situacao] || SITUACAO_CFG.ok;
                        return (
                          <div key={j} className={cn("rounded px-1 py-0.5 text-xs truncate border", cfg.color)} title={ev.titulo}>
                            {ev.titulo}
                          </div>
                        );
                      })}
                      {eventos.length > 2 && (
                        <div className="text-xs text-muted-foreground px-1">+{eventos.length - 2} mais</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Lista do mês */}
      {doMes.length > 0 && (
        <div className="kpi-card">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <CalendarRange className="h-4 w-4" />
            Preventivas de {MESES[mes]}
          </h3>
          <div className="space-y-2">
            {doMes.map(p => {
              const cfg = SITUACAO_CFG[p.situacao] || SITUACAO_CFG.ok;
              return (
                <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{p.titulo}</p>
                    <p className="text-xs text-muted-foreground">{p.equipamento_nome || "—"} · {p.frequencia || "—"}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="text-xs text-muted-foreground">
                      {p.proxima_data ? new Date(p.proxima_data + "T12:00:00").toLocaleDateString("pt-BR") : "—"}
                    </span>
                    <span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", cfg.color)}>{cfg.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isLoading && <p className="text-center text-muted-foreground py-8 text-sm">Carregando...</p>}
      {!isLoading && doMes.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <CalendarRange className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhuma preventiva em {MESES[mes]} {ano}.</p>
        </div>
      )}
    </div>
  );
}