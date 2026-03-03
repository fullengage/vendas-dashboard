import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { formatCurrency, formatNumber, formatPercent } from "@/hooks/useData";
import { Link, useParams, useSearch } from "wouter";
import { motion } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  ArrowLeft,
  Building2,
  DollarSign,
  ShoppingCart,
  CalendarDays,
  Clock,
  TrendingUp,
  MapPin,
  User,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

const MESES_NOME: Record<string, string> = {
  "01": "Jan", "02": "Fev", "03": "Mar", "04": "Abr",
  "05": "Mai", "06": "Jun", "07": "Jul", "08": "Ago",
  "09": "Set", "10": "Out", "11": "Nov", "12": "Dez",
};

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-card border border-border rounded-md shadow-lg p-3 text-xs">
      <p className="font-medium text-foreground mb-1.5">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-mono text-foreground">
            {typeof entry.value === "number" ? formatCurrency(entry.value) : entry.value}
          </span>
        </p>
      ))}
    </div>
  );
}

function diasDesde(dataStr: string | null): string {
  if (!dataStr) return "N/D";
  const d = new Date(dataStr + "T00:00:00");
  const hoje = new Date();
  const diff = Math.floor((hoje.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return "Futuro";
  if (diff === 0) return "Hoje";
  if (diff === 1) return "1 dia atrás";
  if (diff < 30) return `${diff} dias atrás`;
  if (diff < 60) return "1 mês atrás";
  const meses = Math.floor(diff / 30);
  return `${meses} meses atrás`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const parts = dateStr.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
}

export default function HistoricoCliente() {
  const params = useParams<{ nome: string }>();
  const clienteNome = decodeURIComponent(params.nome || "");
  const searchStr = useSearch();
  const searchParams = new URLSearchParams(searchStr);
  const vendedor = searchParams.get("vendedor") || undefined;

  const input = useMemo(() => ({
    cliente: clienteNome,
    vendedor,
  }), [clienteNome, vendedor]);

  const { data, isLoading } = trpc.contas.historicoCliente.useQuery(input);

  const resumo = data?.resumo;
  const titulos = data?.titulos || [];

  const evolucao = useMemo(() => {
    if (!data?.evolucaoMensal) return [];
    return data.evolucaoMensal.map((e: any) => {
      const parts = (e.mes as string).split("-");
      const mesLabel = MESES_NOME[parts[1]] || parts[1];
      return {
        mes: `${mesLabel}/${parts[0]?.slice(2)}`,
        faturado: parseFloat(e.totalValor) || 0,
        recebido: parseFloat(e.totalPago) || 0,
        titulos: e.qtdTitulos,
      };
    });
  }, [data]);

  // Calculate frequency info
  const totalValor = parseFloat(resumo?.totalValor || "0");
  const totalPago = parseFloat(resumo?.totalPago || "0");
  const taxaRecebimento = totalValor > 0 ? (totalPago / totalValor) * 100 : 0;
  const ticketMedio = parseFloat(resumo?.ticketMedio || "0");
  const mediaAtraso = Math.round(parseFloat(resumo?.mediaAtraso || "0") * 10) / 10;
  const mesesComCompra = resumo?.mesesComCompra || 0;

  // Frequency classification
  const freqRatio = mesesComCompra / 12;
  const freqInfo = freqRatio >= 0.8
    ? { label: "Frequente", desc: "Compra quase todo mês", cor: "bg-green-ok-light text-green-ok", icon: <CheckCircle className="w-4 h-4 text-green-ok" /> }
    : freqRatio >= 0.5
    ? { label: "Regular", desc: "Compra com regularidade", cor: "bg-petrol-bg text-petrol", icon: <CalendarDays className="w-4 h-4 text-petrol" /> }
    : freqRatio >= 0.25
    ? { label: "Esporádico", desc: "Compra ocasionalmente", cor: "bg-orange-alert-light text-orange-alert", icon: <AlertTriangle className="w-4 h-4 text-orange-alert" /> }
    : { label: "Raro", desc: "Compra raramente", cor: "bg-red-100 text-red-700", icon: <AlertTriangle className="w-4 h-4 text-red-700" /> };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground font-medium tracking-wide uppercase">Carregando histórico...</span>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              {vendedor ? (
                <Link href={`/vendedor/${encodeURIComponent(vendedor)}`}>
                  <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    Voltar ao Vendedor
                  </button>
                </Link>
              ) : (
                <Link href="/">
                  <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    Dashboard
                  </button>
                </Link>
              )}
              <div>
                <h1 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  {clienteNome}
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5 uppercase tracking-wider flex items-center gap-2">
                  Histórico do Cliente
                  {resumo?.cidade && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {resumo.cidade}
                    </span>
                  )}
                  {resumo?.vendedor && (
                    <span className="inline-flex items-center gap-1">
                      <User className="w-3 h-3" /> {resumo.vendedor}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          <KPISmall icon={<DollarSign className="w-4 h-4" />} label="Total Faturado" value={formatCurrency(totalValor)} />
          <KPISmall icon={<TrendingUp className="w-4 h-4" />} label="Total Recebido" value={formatCurrency(totalPago)} badge={formatPercent(taxaRecebimento)} badgeColor={taxaRecebimento >= 98 ? "green" : taxaRecebimento >= 90 ? "blue" : "orange"} />
          <KPISmall icon={<ShoppingCart className="w-4 h-4" />} label="Ticket Médio" value={formatCurrency(ticketMedio)} sub={`${resumo?.qtdTitulos || 0} títulos`} />
          <KPISmall icon={<CalendarDays className="w-4 h-4" />} label="Última Compra" value={formatDate(resumo?.ultimaCompra || null)} sub={diasDesde(resumo?.ultimaCompra || null)} />
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              {freqInfo.icon}
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Frequência</span>
            </div>
            <p className="text-lg font-bold text-foreground">{mesesComCompra} <span className="text-sm font-normal text-muted-foreground">{mesesComCompra === 1 ? "mês" : "meses"}</span></p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-muted-foreground">{freqInfo.desc}</span>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${freqInfo.cor}`}>{freqInfo.label}</span>
            </div>
          </div>
          <KPISmall icon={<Clock className="w-4 h-4" />} label="Atraso Médio" value={`${mediaAtraso}d`} badge={`${resumo?.titulosAtrasados || 0} atrasados`} badgeColor={mediaAtraso <= 0 ? "green" : mediaAtraso <= 5 ? "blue" : "orange"} />
        </div>

        {/* Evolução Mensal */}
        {evolucao.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="bg-card border border-border rounded-lg p-5">
            <h3 className="text-sm font-semibold text-foreground mb-1">Evolução Mensal</h3>
            <p className="text-xs text-muted-foreground mb-4">Histórico de compras ao longo do tempo</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={evolucao}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="faturado" name="Faturado" fill="#0F4C75" radius={[4, 4, 0, 0]} barSize={24} />
                <Bar dataKey="recebido" name="Recebido" fill="#2D6A4F" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Títulos Table */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-5 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Histórico de Títulos</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {titulos.length} títulos · Ordenados do mais recente ao mais antigo
                </p>
              </div>
              <ShoppingCart className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
          <ScrollArea className="max-h-[500px]">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground uppercase tracking-wider">Nº NF</th>
                    <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground uppercase tracking-wider">Parcela</th>
                    <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground uppercase tracking-wider">Situação</th>
                    <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground uppercase tracking-wider">Descrição</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-muted-foreground uppercase tracking-wider">Vencimento</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-muted-foreground uppercase tracking-wider">Valor</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-muted-foreground uppercase tracking-wider">Pagamento</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-muted-foreground uppercase tracking-wider">Valor Pago</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-muted-foreground uppercase tracking-wider">Desconto</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-muted-foreground uppercase tracking-wider">Atraso</th>
                  </tr>
                </thead>
                <tbody>
                  {titulos.map((t: any, i: number) => {
                    const atraso = t.atrasoDias || 0;
                    const situacaoCor = t.situacao === "PAGO" || t.situacao === "LIQUIDADO"
                      ? "bg-green-ok-light text-green-ok"
                      : t.situacao === "ABERTO"
                      ? "bg-orange-alert-light text-orange-alert"
                      : "bg-muted text-muted-foreground";
                    return (
                      <tr key={t.id || i} className="border-t border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-2 px-3 font-mono">{t.numNf || t.cont}</td>
                        <td className="py-2 px-3 font-mono">{t.parcela}</td>
                        <td className="py-2 px-3">
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${situacaoCor}`}>
                            {t.situacao || "N/D"}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-muted-foreground">{t.descricao || "—"}</td>
                        <td className="py-2 px-3 text-right font-mono">{formatDate(t.dtaVecto)}</td>
                        <td className="py-2 px-3 text-right font-mono font-medium">{formatCurrency(parseFloat(t.valor || "0"))}</td>
                        <td className="py-2 px-3 text-right font-mono">{formatDate(t.dtaPagto)}</td>
                        <td className="py-2 px-3 text-right font-mono">{formatCurrency(parseFloat(t.valorPago || "0"))}</td>
                        <td className="py-2 px-3 text-right font-mono">{parseFloat(t.desconto || "0") > 0 ? formatCurrency(parseFloat(t.desconto)) : "—"}</td>
                        <td className="py-2 px-3 text-right">
                          <span className={`font-mono px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            atraso <= 0 ? "bg-green-ok-light text-green-ok" : atraso <= 5 ? "bg-petrol-bg text-petrol" : "bg-orange-alert-light text-orange-alert"
                          }`}>
                            {atraso}d
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </ScrollArea>
        </motion.div>

        <footer className="text-center py-4 border-t border-border">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
            UNIX PACK Embalagens Flexíveis — Histórico do Cliente
          </p>
        </footer>
      </main>
    </div>
  );
}

function KPISmall({ icon, label, value, sub, badge, badgeColor }: {
  icon: React.ReactNode; label: string; value: string; sub?: string;
  badge?: string; badgeColor?: "green" | "blue" | "orange";
}) {
  const badgeCls = badgeColor === "green" ? "bg-green-ok-light text-green-ok"
    : badgeColor === "blue" ? "bg-petrol-bg text-petrol"
    : "bg-orange-alert-light text-orange-alert";
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-primary">{icon}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <p className="text-lg font-bold font-mono text-foreground">{value}</p>
      <div className="flex items-center justify-between mt-1">
        {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
        {badge && <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${badgeCls}`}>{badge}</span>}
      </div>
    </div>
  );
}
