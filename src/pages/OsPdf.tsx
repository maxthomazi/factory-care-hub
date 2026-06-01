import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Printer, X } from "lucide-react";

export default function OsPdf() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: os, isLoading, isError } = useQuery({
    queryKey: ["os-pdf", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ordens_servico")
        .select(`
          *,
          equipamentos(nome, codigo, localizacao, setor),
          funcionarios:responsavel_id(nome)
        `)
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (os) {
      const timer = setTimeout(() => window.print(), 800);
      return () => clearTimeout(timer);
    }
  }, [os]);

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-screen text-muted-foreground">
      Carregando OS...
    </div>
  );

  if (isError || !os) return (
    <div className="flex items-center justify-center min-h-screen text-destructive">
      OS não encontrada.
    </div>
  );

  const fmt = (d: string | null) =>
    d ? new Date(d + "T12:00:00").toLocaleDateString("pt-BR") : "—";

  const fotos: string[] = os.fotos || [];

  return (
    <>
      <div className="no-print fixed top-4 right-4 flex gap-2 z-50">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 shadow"
        >
          <Printer className="h-4 w-4" /> Imprimir
        </button>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 rounded-md border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50 shadow"
        >
          <X className="h-4 w-4" /> Fechar
        </button>
      </div>

      <div className="pdf-page mx-auto max-w-[210mm] min-h-[297mm] bg-white p-12 text-gray-900">

        {/* Cabeçalho */}
        <div className="flex items-start justify-between border-b-2 border-gray-900 pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">MGM</h1>
            <p className="text-xs text-gray-500 mt-0.5">Máxima Gestão e Manutenção</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold">Ordem de Serviço</p>
            <p className="text-2xl font-bold" style={{ color: "#2563eb" }}>
              #{String(os.numero || os.id.slice(0, 8).toUpperCase())}
            </p>
            <p className="text-xs text-gray-500 mt-1">Emitida em {new Date().toLocaleDateString("pt-BR")}</p>
          </div>
        </div>

        {/* Dados da OS */}
        <section className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Dados da Ordem de Serviço</h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <Row label="Equipamento" value={os.equipamentos?.nome || "—"} />
            <Row label="Código" value={os.equipamentos?.codigo || "—"} />
            <Row label="Localização" value={os.equipamentos?.localizacao || "—"} />
            <Row label="Setor" value={os.equipamentos?.setor || "—"} />
            <Row label="Status" value={os.status} />
            <Row label="Prioridade" value={os.prioridade || "Normal"} />
            <Row label="Data de abertura" value={fmt(os.data_abertura)} />
            <Row label="Data de conclusão" value={fmt(os.data_fechamento)} />
            <Row label="Previsão" value={fmt(os.data_previsao)} />
            <Row label="Solicitante" value={os.solicitante || "—"} />
          </div>
        </section>

        <hr className="border-gray-200 mb-6" />

        {/* Descrição do Serviço */}
        <section className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Descrição do Serviço</h2>
          <div className="space-y-4 text-sm">
            <Block label="Problema relatado" value={os.descricao} />
            <Block label="Serviço executado / Solução aplicada" value={os.solucao} />
            {os.observacoes && <Block label="Observações técnicas" value={os.observacoes} />}
            {os.pecas_utilizadas && <Block label="Peças / Materiais utilizados" value={os.pecas_utilizadas} />}
          </div>
        </section>

        <hr className="border-gray-200 mb-6" />

        {/* Responsável */}
        <section className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Responsável Técnico</h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <Row label="Nome" value={os.funcionarios?.nome || "—"} />
          </div>
        </section>

        {/* Fotos */}
        {fotos.length > 0 && (
          <>
            <hr className="border-gray-200 mb-6" />
            <section className="mb-6">
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Registro Fotográfico</h2>
              <div className="grid grid-cols-2 gap-4">
                {fotos.slice(0, 4).map((url, i) => (
                  <div key={i} className="rounded border border-gray-200 overflow-hidden bg-gray-50" style={{ aspectRatio: "16/9" }}>
                    <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* Rodapé */}
        <div className="mt-12 pt-4 border-t border-gray-200 flex justify-between items-center text-xs text-gray-400">
          <span>MGM — Máxima Gestão e Manutenção</span>
          <span>Gerado em {new Date().toLocaleString("pt-BR")}</span>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; background: white; }
          .pdf-page { max-width: none !important; padding: 2rem !important; }
        }
        @media screen {
          body { background: #f3f4f6; }
          .pdf-page { margin: 2rem auto; box-shadow: 0 4px 24px rgba(0,0,0,0.10); border-radius: 8px; }
        }
      `}</style>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-gray-400 text-xs block">{label}</span>
      <p className="font-medium mt-0.5">{value}</p>
    </div>
  );
}

function Block({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <span className="text-gray-400 text-xs block">{label}</span>
      <p className="mt-1 whitespace-pre-wrap leading-relaxed border-l-2 border-gray-200 pl-3">{value}</p>
    </div>
  );
}
