import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";
import Especialidades from "@/pages/Especialidades";
import Funcionarios from "@/pages/Funcionarios";
import Estoque from "@/pages/Estoque";
import Equipamentos from "@/pages/Equipamentos";
import Preventivas from "@/pages/Preventivas";
import OrdensServico from "@/pages/OrdensServico";
import Solicitacoes from "@/pages/Solicitacoes";
import Relatorios from "@/pages/Relatorios";
import PMOC from "@/pages/PMOC";
import OEE from "@/pages/OEE";
import MapaSituacional from "@/pages/MapaSituacional";
import EquipamentoPublico from "@/pages/EquipamentoPublico";
import EquipamentoHistorico from "@/pages/EquipamentoHistorico";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster richColors position="top-right" />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/eq/:id" element={<EquipamentoPublico />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/equipamentos" element={<Equipamentos />} />
              <Route path="/equipamentos/:id/historico" element={<EquipamentoHistorico />} />
              <Route path="/ordens" element={<OrdensServico />} />
              <Route path="/preventivas" element={<Preventivas />} />
              <Route path="/estoque" element={<Estoque />} />
              <Route path="/funcionarios" element={<Funcionarios />} />
              <Route path="/especialidades" element={<Especialidades />} />
              <Route path="/solicitacoes" element={<Solicitacoes />} />
              <Route path="/relatorios" element={<Relatorios />} />
              <Route path="/pmoc" element={<PMOC />} />
              <Route path="/oee" element={<OEE />} />
              <Route path="/mapa" element={<MapaSituacional />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}