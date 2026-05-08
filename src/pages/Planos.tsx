import { useState } from "react";
import { CheckCircle2, Zap, Building2, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";

const PLANOS = [
  {
    id: "starter",
    nome: "Starter",
    preco: "R$ 197",
    periodo: "/mês",
    descricao: "Ideal para pequenas equipes de manutenção",
    icon: Zap,
    color: "border-slate-200",
    badgeColor: "bg-slate-100 text-slate-700",
    features: [
      "Até 50 equipamentos",
      "Ordens de serviço ilimitadas",
      "Solicitações via QR Code",
      "Dashboard básico",
      "1 usuário admin + 3 técnicos",
      "Suporte por email",
    ],
  },
  {
    id: "pro",
    nome: "Pro",
    preco: "R$ 397",
    periodo: "/mês",
    descricao: "Para equipes que precisam de controle total",
    icon: Rocket,
    color: "border-primary ring-2 ring-primary",
    badgeColor: "bg-primary text-primary-foreground",
    popular: true,
    features: [
      "Equipamentos ilimitados",
      "Ordens de serviço ilimitadas",
      "Solicitações via QR Code",
      "Dashboard completo com OEE",
      "Usuários ilimitados",
      "PMOC — Calendário de preventivas",
      "Relatórios e exportação CSV",
      "Mapa situacional",
      "Importação em massa via Excel",
      "Suporte prioritário",
    ],
  },
  {
    id: "enterprise",
    nome: "Enterprise",
    preco: "Sob consulta",
    periodo: "",
    descricao: "Para grandes operações industriais",
    icon: Building2,
    color: "border-slate-200",
    badgeColor: "bg-slate-100 text-slate-700",
    features: [
      "Tudo do plano Pro",
      "Multi-plantas / Multi-empresas",
      "Integração com ERP",
      "API dedicada",
      "SLA garantido",
      "Treinamento presencial",
      "Gerente de conta dedicado",
      "Customizações sob medida",
    ],
  },
];

export default function Planos() {
  const [periodo, setPeriodo] = useState<"mensal" | "anual">("mensal");
  const desconto = 0.2;

  function calcPreco(preco: string) {
    if (preco === "Sob consulta" || periodo === "mensal") return preco;
    const num = Number(preco.replace(/[^0-9]/g, ""));
    const anual = Math.round(num * (1 - desconto));
    return `R$ ${anual.toLocaleString("pt-BR")}`;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold">Planos e Preços</h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Escolha o plano ideal para sua equipe de manutenção. Todos os planos incluem 14 dias grátis.
        </p>

        {/* Toggle mensal/anual */}
        <div className="flex items-center justify-center gap-3 mt-4">
          <span className={cn("text-sm font-medium", periodo === "mensal" ? "text-foreground" : "text-muted-foreground")}>Mensal</span>
          <button onClick={() => setPeriodo(p => p === "mensal" ? "anual" : "mensal")}
            className={cn("relative h-6 w-11 rounded-full transition-colors", periodo === "anual" ? "bg-primary" : "bg-muted")}>
            <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
              periodo === "anual" ? "translate-x-5" : "translate-x-0.5")} />
          </button>
          <span className={cn("text-sm font-medium", periodo === "anual" ? "text-foreground" : "text-muted-foreground")}>
            Anual <span className="text-green-600 font-semibold">(-20%)</span>
          </span>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {PLANOS.map(plano => {
          const Icon = plano.icon;
          return (
            <div key={plano.id} className={cn("relative rounded-2xl border bg-card p-6 flex flex-col", plano.color)}>
              {plano.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground">
                    Mais popular
                  </span>
                </div>
              )}
              <div className="space-y-4 flex-1">
                <div className="flex items-center gap-3">
                  <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", plano.badgeColor)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{plano.nome}</h3>
                    <p className="text-xs text-muted-foreground">{plano.descricao}</p>
                  </div>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{calcPreco(plano.preco)}</span>
                  {plano.periodo && <span className="text-sm text-muted-foreground">{periodo === "anual" ? "/mês" : plano.periodo}</span>}
                </div>
                {periodo === "anual" && plano.preco !== "Sob consulta" && (
                  <p className="text-xs text-green-600 font-medium -mt-2">Cobrado anualmente</p>
                )}

                <ul className="space-y-2.5">
                  {plano.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6">
                {plano.id === "enterprise" ? (
                  <a href="mailto:contato@cmmspro.com.br"
                    className="block w-full text-center rounded-xl border border-primary px-4 py-3 text-sm font-semibold text-primary hover:bg-primary/5 transition-colors">
                    Falar com consultor
                  </a>
                ) : (
                  <button className={cn("w-full rounded-xl px-4 py-3 text-sm font-semibold transition-colors",
                    plano.popular
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "border border-primary text-primary hover:bg-primary/5")}>
                    Começar grátis por 14 dias
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* FAQ */}
      <div className="max-w-2xl mx-auto space-y-4 pt-4">
        <h2 className="text-xl font-bold text-center">Perguntas frequentes</h2>
        {[
          { q: "Preciso de cartão de crédito para o trial?", r: "Não! Os 14 dias de teste são completamente gratuitos e sem necessidade de cartão." },
          { q: "Posso mudar de plano depois?", r: "Sim, você pode fazer upgrade ou downgrade a qualquer momento. O ajuste é proporcional ao período restante." },
          { q: "Os dados ficam seguros?", r: "Sim. Utilizamos Supabase com PostgreSQL hospedado na AWS, com backups automáticos diários." },
          { q: "Tem suporte em português?", r: "Sim! Nosso suporte é 100% em português, via email e WhatsApp nos planos Pro e Enterprise." },
        ].map(item => (
          <div key={item.q} className="rounded-lg border bg-card p-4">
            <p className="font-medium text-sm">{item.q}</p>
            <p className="text-sm text-muted-foreground mt-1">{item.r}</p>
          </div>
        ))}
      </div>
    </div>
  );
}