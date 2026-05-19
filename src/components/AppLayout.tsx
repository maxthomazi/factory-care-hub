import { useState } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, ClipboardList, Settings2, Package, Wrench,
  CalendarClock, Users, Tag, Bell, ClipboardCheck, BarChart2,
  Map, CreditCard, CalendarRange, ShieldCheck, Activity,
  Menu, X, LogOut, ChevronDown,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const NAV_PRINCIPAL = [
  { to: "/",            icon: LayoutDashboard, label: "Dashboard"    },
  { to: "/ordens",      icon: ClipboardList,   label: "Ordens"       },
  { to: "/pmoc",        icon: CalendarRange,   label: "Calendário"   },
  { to: "/preventivas", icon: CalendarClock,   label: "Preventivas"  },
  { to: "/equipamentos",icon: Settings2,       label: "Equipamentos" },
  { to: "/mapa",        icon: Map,             label: "Mapa"         },
];

const NAV_MAIS = [
  { to: "/estoque",             icon: Package,        label: "Estoque"        },
  { to: "/funcionarios",        icon: Users,          label: "Funcionários"   },
  { to: "/especialidades",      icon: Tag,            label: "Especialidades" },
  { to: "/solicitacoes",        icon: Bell,           label: "Solicitações"   },
  { to: "/checklist-templates", icon: ClipboardCheck, label: "Checklists"     },
  { to: "/relatorios",          icon: BarChart2,      label: "Relatórios"     },
  { to: "/oee",                 icon: Activity,       label: "OEE"            },
  { to: "/importacao",          icon: Package,        label: "Importação"     },
  { to: "/planos",              icon: CreditCard,     label: "Planos"         },
  { to: "/admin",               icon: ShieldCheck,    label: "Admin"          },
];

export function AppLayout() {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const [maisAberto, setMaisAberto] = useState(false);
  const [menuMobile, setMenuMobile] = useState(false);

  const isActive = (to: string) =>
    to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);

  const todosNav = [...NAV_PRINCIPAL, ...NAV_MAIS];

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* TOPBAR */}
      <header className="h-12 shrink-0 border-b bg-card flex items-center px-4 gap-4 z-30">
        <div className="flex items-center gap-2 shrink-0 mr-2">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
            <Wrench className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-sm hidden sm:block">MGM</span>
        </div>

        <nav className="hidden md:flex items-center gap-1 flex-1">
          {NAV_PRINCIPAL.map(item => (
            <NavLink key={item.to} to={item.to}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                isActive(item.to)
                  ? "text-primary border-b-2 border-primary rounded-none pb-[11px]"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}>
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </NavLink>
          ))}

          <div className="relative">
            <button onClick={() => setMaisAberto(v => !v)}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                NAV_MAIS.some(i => isActive(i.to))
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}>
              <Menu className="h-4 w-4" />
              Mais
              <ChevronDown className={cn("h-3 w-3 transition-transform", maisAberto && "rotate-180")} />
            </button>
            {maisAberto && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMaisAberto(false)} />
                <div className="absolute left-0 top-10 z-50 w-52 rounded-xl border bg-card shadow-lg py-1">
                  {NAV_MAIS.map(item => (
                    <NavLink key={item.to} to={item.to}
                      onClick={() => setMaisAberto(false)}
                      className={cn(
                        "flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors",
                        isActive(item.to)
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-foreground hover:bg-muted"
                      )}>
                      <item.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </>
            )}
          </div>
        </nav>

        <div className="flex items-center gap-2 ml-auto">
          <div className="hidden sm:flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
              {profile?.nome?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <span className="text-xs font-medium hidden lg:block">{profile?.nome || "Usuário"}</span>
          </div>
          <button onClick={signOut} title="Sair"
            className="p-1.5 rounded-md hover:bg-muted transition-colors">
            <LogOut className="h-4 w-4 text-muted-foreground" />
          </button>
          <button className="md:hidden p-1.5 rounded-md hover:bg-muted"
            onClick={() => setMenuMobile(v => !v)}>
            {menuMobile ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {menuMobile && (
        <div className="md:hidden border-b bg-card z-20 px-4 py-2 grid grid-cols-3 gap-1">
          {todosNav.map(item => (
            <NavLink key={item.to} to={item.to}
              onClick={() => setMenuMobile(false)}
              className={cn(
                "flex flex-col items-center gap-1 px-2 py-2 rounded-lg text-xs font-medium transition-colors",
                isActive(item.to)
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}>
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </div>
      )}

      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}