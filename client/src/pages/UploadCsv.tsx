/**
 * Upload CSV — Importar novos dados de contas a receber
 */
import { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

// CSV headers mapping - the CSV from the system uses these headers
const EXPECTED_HEADERS = [
  "CONT", "SITUACAO", "PROVISAO", "NUM_NFCUP", "COD_PESSOA", "PARCELA",
  "NUM_ECFSERIENF", "DTA_TRANSF_BORDERAUX", "CTRL_VARIOS_DOCS", "DTA_VECTO",
  "VALOR", "DTA_PAGTO", "VALOR_PAGO", "TIPO_DOC", "DESC_DESCONTO", "DESCONTO",
  "DESC_VALOR", "DTA_EMISSAO", "TIPO_PAGTO", "OBS", "SIT_DOC", "REGIAO",
  "RAZAO_CLI", "CIDADE", "DESCRICAO", "RAZAO", "NOME", "COD_EQUIPE",
  "COD_EMPRESA", "DOCUMENTO", "APELIDO_EMP"
];

// Map from CSV header names to API field names
const HEADER_MAP: Record<string, string> = {
  "CONT": "CONT",
  "SITUACAO": "SITUAÇÃO",
  "SITUAÇÃO": "SITUAÇÃO",
  "PROVISAO": "PROVISÃO",
  "PROVISÃO": "PROVISÃO",
  "NUM_NFCUP": "NUM. NF",
  "NUM. NF": "NUM. NF",
  "COD_PESSOA": "CÓD. PESSOA",
  "CÓD. PESSOA": "CÓD. PESSOA",
  "PARCELA": "PARCELA",
  "NUM_ECFSERIENF": "NUM. ECF/SÉRIE NF",
  "NUM. ECF/SÉRIE NF": "NUM. ECF/SÉRIE NF",
  "DTA_TRANSF_BORDERAUX": "DTA. TRANSF. BORDERAUX",
  "DTA. TRANSF. BORDERAUX": "DTA. TRANSF. BORDERAUX",
  "CTRL_VARIOS_DOCS": "CTRL. VÁRIOS DOCS",
  "CTRL. VÁRIOS DOCS": "CTRL. VÁRIOS DOCS",
  "DTA_VECTO": "DTA. VECTO.",
  "DTA. VECTO.": "DTA. VECTO.",
  "VALOR": "VALOR",
  "DTA_PAGTO": "DTA. PAGTO.",
  "DTA. PAGTO.": "DTA. PAGTO.",
  "VALOR_PAGO": "VALOR PAGO",
  "VALOR PAGO": "VALOR PAGO",
  "TIPO_DOC": "TIPO DOC.",
  "TIPO DOC.": "TIPO DOC.",
  "DESC_DESCONTO": "DESC. DESCONTO",
  "DESC. DESCONTO": "DESC. DESCONTO",
  "DESCONTO": "DESCONTO",
  "DESC_VALOR": "DESC. VALOR",
  "DESC. VALOR": "DESC. VALOR",
  "DTA_EMISSAO": "DTA. EMISSÃO",
  "DTA. EMISSÃO": "DTA. EMISSÃO",
  "TIPO_PAGTO": "TIPO PAGTO.",
  "TIPO PAGTO.": "TIPO PAGTO.",
  "OBS": "OBS",
  "SIT_DOC": "SIT. DOC.",
  "SIT. DOC.": "SIT. DOC.",
  "REGIAO": "REGIÃO",
  "REGIÃO": "REGIÃO",
  "RAZAO_CLI": "RAZÃO CLI.",
  "RAZÃO CLI.": "RAZÃO CLI.",
  "CIDADE": "CIDADE",
  "DESCRICAO": "DESCRIÇÃO",
  "DESCRIÇÃO": "DESCRIÇÃO",
  "RAZAO": "RAZÃO",
  "RAZÃO": "RAZÃO",
  "NOME": "VENDEDOR",
  "VENDEDOR": "VENDEDOR",
  "COD_EQUIPE": "CÓD. EQUIPE",
  "CÓD. EQUIPE": "CÓD. EQUIPE",
  "COD_EMPRESA": "CÓD. EMPRESA",
  "CÓD. EMPRESA": "CÓD. EMPRESA",
  "DOCUMENTO": "DOCUMENTO",
  "APELIDO_EMP": "APELIDO EMP.",
  "APELIDO EMP.": "APELIDO EMP.",
  "ATRASO_DIAS": "ATRASO DIAS",
  "ATRASO DIAS": "ATRASO DIAS",
};

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split("\n").filter(l => l.trim().length > 0);
  
  // Find the header line (look for CONT in the first column)
  let headerIdx = -1;
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const firstCol = lines[i].split(";")[0].trim().toUpperCase();
    if (firstCol === "CONT") {
      headerIdx = i;
      break;
    }
  }
  
  if (headerIdx === -1) {
    throw new Error("Cabeçalho do CSV não encontrado. Verifique se o arquivo contém a coluna CONT.");
  }
  
  const headers = lines[headerIdx].split(";").map(h => h.trim());
  const rows: Record<string, string>[] = [];
  
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const values = lines[i].split(";");
    if (values.length < 5) continue;
    
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      const mappedKey = HEADER_MAP[h] || h;
      row[mappedKey] = (values[idx] || "").trim();
    });
    
    // Skip rows without CONT or PARCELA
    if (!row["CONT"] || !row["PARCELA"]) continue;
    // Skip summary rows
    if (row["CONT"].includes("Número") || row["CONT"].includes("Total")) continue;
    
    rows.push(row);
  }
  
  return { headers, rows };
}

export default function UploadCsv() {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<{ headers: string[]; rows: Record<string, string>[] } | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ total: number; inserted: number; skipped: number } | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const importMutation = trpc.contas.importCsv.useMutation();
  const utils = trpc.useUtils();

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setResult(null);
    setParseError(null);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseCSV(text);
        setParsedData(parsed);
        toast.success(`${parsed.rows.length} registros encontrados no arquivo`);
      } catch (err: any) {
        setParseError(err.message);
        setParsedData(null);
      }
    };
    reader.readAsText(selectedFile, "iso-8859-1");
  }, []);

  const handleImport = useCallback(async () => {
    if (!parsedData) return;
    
    setImporting(true);
    setResult(null);
    
    try {
      // Send in batches of 500
      const batchSize = 500;
      let totalInserted = 0;
      let totalSkipped = 0;
      
      for (let i = 0; i < parsedData.rows.length; i += batchSize) {
        const batch = parsedData.rows.slice(i, i + batchSize);
        const records = batch.map(row => ({
          CONT: row["CONT"] || "",
          "SITUAÇÃO": row["SITUAÇÃO"] || "",
          "PROVISÃO": row["PROVISÃO"] || "",
          "NUM. NF": row["NUM. NF"] || "",
          "CÓD. PESSOA": row["CÓD. PESSOA"] || "",
          PARCELA: row["PARCELA"] || "",
          "NUM. ECF/SÉRIE NF": row["NUM. ECF/SÉRIE NF"] || "",
          "DTA. TRANSF. BORDERAUX": row["DTA. TRANSF. BORDERAUX"] || "",
          "CTRL. VÁRIOS DOCS": row["CTRL. VÁRIOS DOCS"] || "",
          "DTA. VECTO.": row["DTA. VECTO."] || "",
          VALOR: row["VALOR"] || "0",
          "DTA. PAGTO.": row["DTA. PAGTO."] || "",
          "VALOR PAGO": row["VALOR PAGO"] || "0",
          "TIPO DOC.": row["TIPO DOC."] || "",
          "DESC. DESCONTO": row["DESC. DESCONTO"] || "",
          DESCONTO: row["DESCONTO"] || "0",
          "DESC. VALOR": row["DESC. VALOR"] || "",
          "DTA. EMISSÃO": row["DTA. EMISSÃO"] || "",
          "TIPO PAGTO.": row["TIPO PAGTO."] || "",
          OBS: row["OBS"] || "",
          "SIT. DOC.": row["SIT. DOC."] || "",
          "REGIÃO": row["REGIÃO"] || "",
          "RAZÃO CLI.": row["RAZÃO CLI."] || "",
          CIDADE: row["CIDADE"] || "",
          "DESCRIÇÃO": row["DESCRIÇÃO"] || "",
          "RAZÃO": row["RAZÃO"] || "",
          VENDEDOR: row["VENDEDOR"] || "",
          "CÓD. EQUIPE": row["CÓD. EQUIPE"] || "",
          "CÓD. EMPRESA": row["CÓD. EMPRESA"] || "1",
          DOCUMENTO: row["DOCUMENTO"] || "",
          "APELIDO EMP.": row["APELIDO EMP."] || "",
          "ATRASO DIAS": row["ATRASO DIAS"] || "",
        }));
        
        const res = await importMutation.mutateAsync({ records });
        totalInserted += res.inserted;
        totalSkipped += res.skipped;
      }
      
      setResult({
        total: parsedData.rows.length,
        inserted: totalInserted,
        skipped: totalSkipped,
      });
      
      // Invalidate all queries to refresh data
      utils.contas.invalidate();
      
      toast.success(`Importação concluída! ${totalInserted} registros importados.`);
    } catch (err: any) {
      toast.error(`Erro na importação: ${err.message}`);
    } finally {
      setImporting(false);
    }
  }, [parsedData, importMutation, utils]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container py-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm" className="h-8">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Voltar
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" />
                Importar CSV
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5 uppercase tracking-wider">
                Adicionar dados de contas a receber
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-8 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Info */}
          <div className="bg-card border border-border rounded-lg p-5">
            <h3 className="text-sm font-semibold text-foreground mb-2">Como funciona</h3>
            <ul className="text-xs text-muted-foreground space-y-1.5">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-green-ok mt-0.5 shrink-0" />
                O sistema aceita o CSV padrão exportado do sistema de contas a receber
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-green-ok mt-0.5 shrink-0" />
                Registros duplicados (mesmo CONT + PARCELA + EMPRESA) são atualizados automaticamente
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-green-ok mt-0.5 shrink-0" />
                Novos registros são inseridos sem afetar os dados existentes
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-green-ok mt-0.5 shrink-0" />
                Separador: ponto e vírgula (;) — Codificação: ISO-8859-1 ou UTF-8
              </li>
            </ul>
          </div>

          {/* Upload area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border rounded-lg p-10 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />
            <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">
              {file ? file.name : "Clique para selecionar o arquivo CSV"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {file ? `${(file.size / 1024).toFixed(1)} KB` : "Formato: .csv ou .txt com separador ;"}
            </p>
          </div>

          {/* Parse error */}
          {parseError && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">Erro ao ler o arquivo</p>
                <p className="text-xs text-destructive/80 mt-1">{parseError}</p>
              </div>
            </div>
          )}

          {/* Preview */}
          {parsedData && (
            <div className="bg-card border border-border rounded-lg p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Prévia dos dados</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {parsedData.rows.length} registros encontrados
                  </p>
                </div>
                <Button
                  onClick={handleImport}
                  disabled={importing}
                  size="sm"
                  className="h-8"
                >
                  {importing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5 mr-1.5" />
                      Importar {parsedData.rows.length} registros
                    </>
                  )}
                </Button>
              </div>

              {/* Sample rows */}
              <div className="overflow-x-auto">
                <table className="w-full text-[10px]">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left py-1.5 px-2 font-semibold text-muted-foreground">CONT</th>
                      <th className="text-left py-1.5 px-2 font-semibold text-muted-foreground">PARCELA</th>
                      <th className="text-left py-1.5 px-2 font-semibold text-muted-foreground">DTA VECTO</th>
                      <th className="text-right py-1.5 px-2 font-semibold text-muted-foreground">VALOR</th>
                      <th className="text-left py-1.5 px-2 font-semibold text-muted-foreground">VENDEDOR</th>
                      <th className="text-left py-1.5 px-2 font-semibold text-muted-foreground">CLIENTE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.rows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-t border-border/50">
                        <td className="py-1.5 px-2 text-foreground">{row["CONT"]}</td>
                        <td className="py-1.5 px-2 text-foreground">{row["PARCELA"]}</td>
                        <td className="py-1.5 px-2 text-foreground">{row["DTA. VECTO."]}</td>
                        <td className="py-1.5 px-2 text-right font-mono text-foreground">{row["VALOR"]}</td>
                        <td className="py-1.5 px-2 text-foreground truncate max-w-[120px]">{row["VENDEDOR"]}</td>
                        <td className="py-1.5 px-2 text-foreground truncate max-w-[150px]">{row["RAZÃO CLI."]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedData.rows.length > 5 && (
                  <p className="text-[10px] text-muted-foreground text-center py-2">
                    ... e mais {parsedData.rows.length - 5} registros
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-green-ok/10 border border-green-ok/30 rounded-lg p-5"
            >
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-ok" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Importação concluída!</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {result.inserted} registros importados/atualizados de {result.total} total
                    {result.skipped > 0 && ` (${result.skipped} com erro)`}
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <Link href="/">
                  <Button variant="outline" size="sm" className="h-8 text-xs">
                    <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                    Voltar ao Dashboard
                  </Button>
                </Link>
              </div>
            </motion.div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
