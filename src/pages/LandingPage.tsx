import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wrench, QrCode, BarChart2, CalendarClock, Bell, Shield,
  CheckCircle2, ChevronDown, Menu, X, ArrowRight, Star,
  Zap, Building2, Rocket, Users, Clock, TrendingUp,
} from "lucide-react";

const NAV_LINKS = [
  { label: "Funcionalidades", href: "#funcionalidades" },
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Planos", href: "#planos" },
  { label: "Contato", href: "#contato" },
];

const FUNCIONALIDADES = [
  {
    icon: QrCode,
    titulo: "QR Code nas máquinas",
    descricao: "Operadores abrem solicitações de manutenção escaneando o QR Code do equipamento. Sem login, sem burocracia.",
    color: "bg-blue-100 text-blue-600",
  },
  {
    icon: Bell,
    titulo: "Fluxo de solicitações",
    descricao: "Solicitação → Planejador distribui para o técnico → Técnico resolve ou abre OS. Igual ao Keepfy, mas sem mensalidade absurda.",
    color: "bg-amber-100 text-amber-600",
  },
  {
    icon: CalendarClock,
    titulo: "PMOC e Preventivas",
    descricao: "Calendário visual de manutenções preventivas com alertas automáticos de vencimento e histórico completo.",
    color: "bg-green-100 text-green-600",
  },
  {
    icon: BarChart2,
    titulo: "OEE e Indicadores",
    descricao: "Dashboard com MTBF, MTTR, disponibilidade, OEE e custo por equipamento em tempo real.",
    color: "bg-purple-100 text-purple-600",
  },
  {
    icon: Wrench,
    titulo: "Ordens de Serviço",
    descricao: "Criação, distribuição e fechamento de OS com técnicos, peças utilizadas, checklist e solução aplicada.",
    color: "bg-red-100 text-red-600",
  },
  {
    icon: Shield,
    titulo: "Multi-empresa",
    descricao: "Cada empresa tem seus dados completamente isolados. Ideal para grupos industriais com múltiplas plantas.",
    color: "bg-slate-100 text-slate-600",
  },
];

const COMO_FUNCIONA = [
  { passo: "01", titulo: "Cadastre sua empresa", descricao: "Crie sua conta em 2 minutos. Sem cartão de crédito, sem configurações complexas." },
  { passo: "02", titulo: "Importe seus equipamentos", descricao: "Suba uma planilha Excel com todos os equipamentos e importe em massa de uma vez." },
  { passo: "03", titulo: "Cole os QR Codes", descricao: "Imprima e cole os QR Codes em cada máquina. Operadores já podem abrir solicitações." },
  { passo: "04", titulo: "Gerencie tudo", descricao: "Dashboard completo com OS, preventivas, estoque, OEE e custos em um só lugar." },
];

const PLANOS = [
  {
    id: "starter",
    nome: "Starter",
    preco: "R$ 197",
    periodo: "/mês",
    descricao: "Para pequenas equipes",
    icon: Zap,
    popular: false,
    features: [
      "Até 50 equipamentos",
      "OS ilimitadas",
      "QR Code nas máquinas",
      "Dashboard básico",
      "4 usuários",
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
    popular: true,
    features: [
      "Equipamentos ilimitados",
      "OS ilimitadas",
      "QR Code nas máquinas",
      "OEE + Indicadores completos",
      "Usuários ilimitados",
      "PMOC — Calendário",
      "Relatórios e exportação",
      "Mapa situacional",
      "Importação via Excel",
      "Suporte prioritário",
    ],
  },
  {
    id: "enterprise",
    nome: "Enterprise",
    preco: "Sob consulta",
    periodo: "",
    descricao: "Para grandes operações",
    icon: Building2,
    popular: false,
    features: [
      "Tudo do Pro",
      "Multi-plantas",
      "API dedicada",
      "SLA garantido",
      "Treinamento presencial",
      "Gerente de conta",
    ],
  },
];

const DEPOIMENTOS = [
  {
    nome: "Carlos Mendes",
    cargo: "Gerente de Manutenção",
    empresa: "Indústria Alimentícia SP",
    texto: "Reduzimos o tempo de resposta em 60% depois de implementar o MGM. O QR Code nas máquinas mudou completamente nossa operação.",
    estrelas: 5,
  },
  {
    nome: "Ana Paula Silva",
    cargo: "Coordenadora de Operações",
    empresa: "Bebidas do Sul",
    texto: "A visibilidade que temos agora dos custos de manutenção por equipamento nos ajudou a tomar decisões muito melhores de investimento.",
    estrelas: 5,
  },
  {
    nome: "Roberto Ferreira",
    cargo: "Diretor Industrial",
    empresa: "Grupo Metalúrgico MG",
    texto: "Implementamos em 3 plantas em menos de uma semana. O suporte foi excelente e o sistema é muito intuitivo.",
    estrelas: 5,
  },
];

const FAQS = [
  { q: "Preciso de cartão de crédito para o trial?", r: "Não! Os 14 dias são completamente gratuitos e sem necessidade de cartão." },
  { q: "Quanto tempo leva para implementar?", r: "A maioria das empresas está operacional em menos de 1 dia. Basta importar os equipamentos e colar os QR Codes." },
  { q: "Os dados ficam seguros?", r: "Sim. Utilizamos Supabase com PostgreSQL hospedado na AWS, com backups automáticos e dados isolados por empresa." },
  { q: "Posso usar no celular?", r: "Sim! O MGM é totalmente responsivo e funciona em qualquer dispositivo. Os operadores abrem solicitações pelo celular via QR Code." },
  { q: "Tem integração com outros sistemas?", r: "No plano Enterprise oferecemos API dedicada para integração com ERP e outros sistemas." },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [menuAberto, setMenuAberto] = useState(false);
  const [faqAberto, setFaqAberto] = useState<number | null>(null);
  const [periodo, setPeriodo] = useState<"mensal" | "anual">("mensal");

  function scrollTo(href: string) {
    setMenuAberto(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }

  function calcPreco(preco: string) {
    if (preco === "Sob consulta" || periodo === "mensal") return preco;
    const num = Number(preco.replace(/[^0-9]/g, ""));
    return `R$ ${Math.round(num * 0.8).toLocaleString("pt-BR")}`;
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">

      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Wrench className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-lg">MGM</span>
            <span className="hidden sm:block text-xs text-gray-400 ml-1">Máxima Gestão e Manutenção</span>
          </div>

          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map(l => (
              <button key={l.href} onClick={() => scrollTo(l.href)}
                className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
                {l.label}
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button onClick={() => navigate("/login")}
              className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
              Entrar
            </button>
            <button onClick={() => navigate("/login")}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
              Começar grátis <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <button className="md:hidden p-2" onClick={() => setMenuAberto(v => !v)}>
            {menuAberto ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {menuAberto && (
          <div className="md:hidden border-t bg-white px-4 py-4 space-y-3">
            {NAV_LINKS.map(l => (
              <button key={l.href} onClick={() => scrollTo(l.href)}
                className="block w-full text-left text-sm text-gray-600 py-2">
                {l.label}
              </button>
            ))}
            <button onClick={() => navigate("/login")}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white">
              Começar grátis
            </button>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="pt-32 pb-20 px-4 bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-1.5 text-sm font-medium text-blue-700">
            <Zap className="h-3.5 w-3.5" />
            14 dias grátis · Sem cartão de crédito
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
            Gestão de manutenção
            <span className="text-blue-600"> industrial</span>
            <br />do jeito certo
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            QR Code nas máquinas, ordens de serviço, preventivas, OEE e indicadores — tudo em um só lugar. Implemente em menos de 1 dia.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => navigate("/login")}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-4 text-base font-semibold text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">
              Começar gratuitamente <ArrowRight className="h-5 w-5" />
            </button>
            <button onClick={() => scrollTo("#como-funciona")}
              className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-8 py-4 text-base font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
              Ver como funciona
            </button>
          </div>
          <div className="flex items-center justify-center gap-6 text-sm text-gray-400 flex-wrap">
            <span className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-green-500" />Sem cartão</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-green-500" />Sem instalação</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-green-500" />Suporte em português</span>
          </div>
        </div>
      </section>

      {/* MÉTRICAS */}
      <section className="py-12 border-y border-gray-100 bg-white">
        <div className="max-w-4xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { valor: "-60%", label: "Tempo de resposta", icon: Clock },
            { valor: "+40%", label: "Disponibilidade", icon: TrendingUp },
            { valor: "1 dia", label: "Para implementar", icon: Zap },
            { valor: "24/7", label: "Acesso via QR Code", icon: QrCode },
          ].map(m => (
            <div key={m.label} className="text-center space-y-1">
              <m.icon className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-gray-900">{m.valor}</p>
              <p className="text-sm text-gray-500">{m.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FUNCIONALIDADES */}
      <section id="funcionalidades" className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 space-y-3">
            <h2 className="text-3xl font-bold">Tudo que sua equipe precisa</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Do operador que abre uma solicitação até o gestor que analisa os indicadores — o MGM cobre todo o fluxo.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FUNCIONALIDADES.map(f => (
              <div key={f.titulo} className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-md transition-shadow space-y-3">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${f.color}`}>
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-gray-900">{f.titulo}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.descricao}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12 space-y-3">
            <h2 className="text-3xl font-bold">Implemente em 4 passos</h2>
            <p className="text-gray-500">Sem consultoria cara, sem meses de implantação.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {COMO_FUNCIONA.map((p, i) => (
              <div key={p.passo} className="flex gap-4 p-6 rounded-2xl border border-gray-100 hover:border-blue-200 transition-colors">
                <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 text-white font-bold text-lg">
                  {p.passo}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{p.titulo}</h3>
                  <p className="text-sm text-gray-500">{p.descricao}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DEPOIMENTOS */}
      <section className="py-20 px-4 bg-blue-600">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 space-y-3">
            <h2 className="text-3xl font-bold text-white">O que dizem nossos clientes</h2>
            <p className="text-blue-200">Empresas que transformaram sua manutenção com o MGM</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {DEPOIMENTOS.map(d => (
              <div key={d.nome} className="bg-white/10 backdrop-blur rounded-2xl p-6 space-y-4">
                <div className="flex gap-1">
                  {Array.from({ length: d.estrelas }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-white/90 text-sm leading-relaxed">"{d.texto}"</p>
                <div>
                  <p className="font-semibold text-white text-sm">{d.nome}</p>
                  <p className="text-blue-200 text-xs">{d.cargo} · {d.empresa}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLANOS */}
      <section id="planos" className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8 space-y-3">
            <h2 className="text-3xl font-bold">Planos e preços</h2>
            <p className="text-gray-500">Sem surpresas. Cancele quando quiser.</p>
            <div className="flex items-center justify-center gap-3 mt-4">
              <span className={`text-sm font-medium ${periodo === "mensal" ? "text-gray-900" : "text-gray-400"}`}>Mensal</span>
              <button onClick={() => setPeriodo(p => p === "mensal" ? "anual" : "mensal")}
                className={`relative h-6 w-11 rounded-full transition-colors ${periodo === "anual" ? "bg-blue-600" : "bg-gray-200"}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${periodo === "anual" ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
              <span className={`text-sm font-medium ${periodo === "anual" ? "text-gray-900" : "text-gray-400"}`}>
                Anual <span className="text-green-600 font-semibold">(-20%)</span>
              </span>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {PLANOS.map(plano => (
              <div key={plano.id} className={`relative rounded-2xl border p-6 flex flex-col ${plano.popular ? "border-blue-600 ring-2 ring-blue-600" : "border-gray-200"}`}>
                {plano.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-blue-600 px-4 py-1 text-xs font-semibold text-white">Mais popular</span>
                  </div>
                )}
                <div className="space-y-4 flex-1">
                  <div>
                    <h3 className="font-bold text-lg">{plano.nome}</h3>
                    <p className="text-xs text-gray-500">{plano.descricao}</p>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">{calcPreco(plano.preco)}</span>
                    {plano.periodo && <span className="text-sm text-gray-400">{plano.periodo}</span>}
                  </div>
                  <ul className="space-y-2">
                    {plano.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-6">
                  {plano.id === "enterprise" ? (
                    <a href="mailto:contato@mgmsistemas.com.br"
                      className="block w-full text-center rounded-xl border border-blue-600 px-4 py-3 text-sm font-semibold text-blue-600 hover:bg-blue-50 transition-colors">
                      Falar com consultor
                    </a>
                  ) : (
                    <button onClick={() => navigate("/login")}
                      className={`w-full rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${plano.popular ? "bg-blue-600 text-white hover:bg-blue-700" : "border border-blue-600 text-blue-600 hover:bg-blue-50"}`}>
                      Começar grátis por 14 dias
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-10">Perguntas frequentes</h2>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <button onClick={() => setFaqAberto(faqAberto === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left">
                  <span className="font-medium text-sm">{faq.q}</span>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform shrink-0 ml-3 ${faqAberto === i ? "rotate-180" : ""}`} />
                </button>
                {faqAberto === i && (
                  <div className="px-5 pb-4 text-sm text-gray-500">{faq.r}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section id="contato" className="py-20 px-4 bg-gradient-to-br from-blue-600 to-indigo-700">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h2 className="text-3xl font-bold text-white">Pronto para transformar sua manutenção?</h2>
          <p className="text-blue-100">Junte-se a empresas que já modernizaram sua gestão com o MGM. Comece grátis hoje.</p>
          <button onClick={() => navigate("/login")}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-semibold text-blue-600 hover:bg-blue-50 transition-colors shadow-xl">
            Começar 14 dias grátis <ArrowRight className="h-5 w-5" />
          </button>
          <p className="text-blue-200 text-sm">Sem cartão de crédito · Cancele quando quiser</p>
        </div>
      </section>

      {/* RODAPÉ */}
      <footer className="py-10 px-4 bg-gray-900 text-gray-400">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <Wrench className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-white text-sm">MGM</span>
            <span className="text-xs">Máxima Gestão e Manutenção</span>
          </div>
          <p className="text-xs">© {new Date().getFullYear()} MGM. Todos os direitos reservados.</p>
          <div className="flex gap-4 text-xs">
            <a href="mailto:contato@mgmsistemas.com.br" className="hover:text-white transition-colors">contato@mgmsistemas.com.br</a>
          </div>
        </div>
      </footer>
    </div>
  );
}