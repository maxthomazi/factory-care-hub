import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Download, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface EquipamentoRow {
  nome: string;
  codigo: string;
  localizacao?: string;
  status?: string;
  criticidade?: string;
  grupo?: string;
  modelo?: string;
  numero_serie?: string;
  garantia_ate?: string;
  erro?: string;
}

export default function ImportacaoEquipamentos() {
  const qc = useQueryClient();
  const [rows, setRows] = useState<EquipamentoRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<{ ok: number; erro: number } | null>(null);

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      ["nome", "codigo", "localizacao", "status", "criticidade", "grupo", "modelo", "numero_serie", "garantia_ate"],
      ["Compressor de Ar", "CA-001", "Sala de Compressores", "operando", "A", "Utilidades", "Atlas Copco GA30", "SN123456", "2026-12-31"],
      ["Esteira Transportadora", "ET-002", "Linha 1", "operando", "B", "Produção", "", "", ""],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Equipamentos");
    XLSX.writeFile(wb, "template_equipamentos.xlsx");
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<any>(ws);
      const validados = json.map((row: any) => {
        const r: EquipamentoRow = {
          nome: String(row.nome || "").trim(),
          codigo: String(row.codigo || "").trim(),
          localizacao: String(row.localizacao || "").trim() || undefined,
          status: row.status || "operando",
          criticidade: ["A","B","C"].includes(row.criticidade) ? row.criticidade : undefined,
          grupo: String(row.grupo || "").trim() || undefined,
          modelo: String(row.modelo || "").trim() || undefined,
          numero_serie: String(row.numero_serie || "").trim() || undefined,
          garantia_ate: row.garantia_ate ? String(row.garantia_ate).trim() : undefined,
        };
        if (!r.nome) r.erro = "Nome obrigatório";
        if (!r.codigo) r.erro = (r.erro ? r.erro + "; " : "") + "Código obrigatório";
        return r;
      });
      setRows(validados);
      setResults(null);
    };
    reader.readAsArrayBuffer(file);
  }

  const importar = useMutation({
    mutationFn: async () => {
      setImporting(true);
      const validos = rows.filter(r => !r.erro);
      let ok = 0; let erro = 0;
      for (const row of validos) {
        const { error } = await supabase.from("equipamentos").insert({
          nome: row.nome,
          codigo: row.codigo,
          localizacao: row.localizacao || null,
          status: row.status || "operando",
          criticidade: row.criticidade || null,
          grupo: row.grupo || null,
          modelo: row.modelo || null,
          numero_serie: row.numero_serie || null,
          garantia_ate: row.garantia_ate || null,
        });
        if (error) erro++; else ok++;
      }
      setResults({ ok, erro });
      setImporting(false);
      return { ok, erro };
    },
    onSuccess: ({ ok }) => {
      qc.invalidateQueries({ queryKey: ["equipamentos"] });
      toast.success(`${ok} equipamento(s) importado(s) com sucesso!`);
    },
    onError: () => { setImporting(false); toast.error("Erro na importação"); },
  });

  const validos = rows.filter(r => !r.erro).length;
  const invalidos = rows.filter(r => r.erro).length;

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="page-title">Importação de Equipamentos</h1>
        <p className="text-sm text-muted-foreground mt-1">Importe múltiplos equipamentos via planilha Excel</p>
      </div>

      {/* Instruções */}
      <div className="rounded-lg border bg-blue-50 border-blue-200 p-4 space-y-2">
        <h3 className="text-sm font-semibold text-blue-800">Como usar</h3>
        <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
          <li>Baixe o template Excel abaixo</li>
          <li>Preencha os dados dos equipamentos</li>
          <li>Faça upload do arquivo preenchido</li>
          <li>Revise os dados e clique em Importar</li>
        </ol>
      </div>

      {/* Ações */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button onClick={downloadTemplate}
          className="flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
          <Download className="h-4 w-4" />Baixar template Excel
        </button>
        <label className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer">
          <Upload className="h-4 w-4" />
          {rows.length > 0 ? "Trocar arquivo" : "Selecionar arquivo Excel"}
          <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" />
        </label>
      </div>

      {/* Preview */}
      {rows.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium">{rows.length} linha(s) encontrada(s)</span>
            {validos > 0 && (
              <span className="flex items-center gap-1 text-sm text-green-600 font-medium">
                <CheckCircle2 className="h-4 w-4" />{validos} válida(s)
              </span>
            )}
            {invalidos > 0 && (
              <span className="flex items-center gap-1 text-sm text-red-600 font-medium">
                <XCircle className="h-4 w-4" />{invalidos} com erro
              </span>
            )}
          </div>

          <div className="rounded-lg border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Nome</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Código</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground hidden sm:table-cell">Localização</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground hidden md:table-cell">Criticidade</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground hidden lg:table-cell">Grupo</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className={`border-b last:border-0 ${row.erro ? "bg-red-50" : ""}`}>
                      <td className="px-3 py-2">
                        {row.erro
                          ? <span title={row.erro}><AlertTriangle className="h-4 w-4 text-red-500" /></span>
                          : <CheckCircle2 className="h-4 w-4 text-green-500" />}
                      </td>
                      <td className="px-3 py-2 font-medium">{row.nome || <span className="text-red-500">—</span>}</td>
                      <td className="px-3 py-2">{row.codigo || <span className="text-red-500">—</span>}</td>
                      <td className="px-3 py-2 hidden sm:table-cell text-muted-foreground">{row.localizacao || "—"}</td>
                      <td className="px-3 py-2 hidden md:table-cell">
                        {row.criticidade && (
                          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${row.criticidade === "A" ? "bg-red-100 text-red-700" : row.criticidade === "B" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                            {row.criticidade}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 hidden lg:table-cell text-muted-foreground">{row.grupo || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {results && (
            <div className={`rounded-lg border p-4 ${results.erro > 0 ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200"}`}>
              <p className="text-sm font-medium">
                ✅ {results.ok} importado(s) com sucesso
                {results.erro > 0 && ` · ❌ ${results.erro} com erro`}
              </p>
            </div>
          )}

          {validos > 0 && !results && (
            <button onClick={() => importar.mutate()} disabled={importing}
              className="flex items-center gap-2 rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              <Upload className="h-4 w-4" />
              {importing ? `Importando...` : `Importar ${validos} equipamento(s)`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}