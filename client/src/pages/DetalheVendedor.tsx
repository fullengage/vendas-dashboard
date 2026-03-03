import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAnos, formatCurrency, formatNumber, formatPercent } from "@/hooks/useData";
import { Link, useParams } from "wouter";
import { motion } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import {
  ArrowLeft,
  User,
  DollarSign,
  Users,
  Clock,
  TrendingUp,
  ArrowUpDown,
  ShoppingCart,
  CalendarDays,
  AlertTriangle,
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
  if (diff === 1) return "1 dia";
  if (diff < 30) return `${diff} dias`;
  if (diff < 60) return "1 mês";
  const meses = Math.floor(diff / 30);
  return `${meses} meses`;
}

function frequenciaLabel(meses: number, totalMesesPeriodo: number): { label: string; cor: string } {
  const ratio = totalMesesPeriodo > 0 ? meses / totalMesesPeriodo : 0;
  if (ratio >= 0.8) return { label: "Frequente", cor: "bg-green-ok-light text-green-ok" };
  if (ratio >= 0.5) return { label: "Regular", cor: "bg-petrol-bg text-petrol" };
  if (ratio >= 0.25) return { label: "Esporádico", cor: "bg-orange-alert-light text-orange-alert" };
  return { label: "Raro", cor: "bg-red-100 text-red-700" };
}

type ClientSortField = "cliente" | "totalValor" | "totalPago" | "qtdTitulos" | "ticketMedio" | "ultimaCompra" | "mesesComCompra" | "mediaAtraso";

export default function DetalheVendedor() {
  const params = useParams<{ nome: string }>();
  const vendedorNome = decodeURIComponent(params.nome || "");
  const [anoFilter, setAnoFilter] = useState("todos");
  const [sortField, setSortField] = useState<ClientSortField>("totalValor");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const anosQuery = useAnos();

  const detalheInput = useMemo(() => ({
    vendedor: vendedorNome,
    ano: anoFilter !== "todos" ? anoFilter : undefined,
  }), [vendedorNome, anoFilter]);

  const { data: detalhe, isLoading: loadingDetalhe } = trpc.contas.detalheVendedor.useQuery(detalheInput);
  const { data: clientes, isLoading: loadingClientes } = trpc.contas.clientesDoVendedor.useQuery(detalheInput);

  const kpis = detalhe?.kpis;
  const evolucao = useMemo(() => {
    if (!detalhe?.evolucao) return [];
    return detalhe.evolucao.map((e: any) => {
      const parts = (e.mes as string).split("-");
      const mesLabel = MESES_NOME[parts[1]] || parts[1];
      return {
        mes: `${mesLabel}/${parts[0]?.slice(2)}`,
        faturado: parseFloat(e.totalValor) || 0,
        recebido: parseFloat(e.totalPago) || 0,
        titulos: e.qtdTitulos,
      };
    });
  }, [detalhe]);

  // Determine total months in period for frequency calculation
  const totalMesesPeriodo = evolucao.length > 0 ? evolucao.length : 12;

  // Sort clients
  const sortedClientes = useMemo(() => {
    if (!clientes) return [];
    const sorted = [...clientes];
    sorted.sort((a: any, b: any) => {
      let aVal: any, bVal: any;
      switch (sortField) {
        case "cliente": aVal = a.cliente || ""; bVal = b.cliente || ""; break;
        case "totalValor": aVal = parseFloat(a.totalValor); bVal = parseFloat(b.totalValor); break;
        case "totalPago": aVal = parseFloat(a.totalPago); bVal = parseFloat(b.totalPago); break;
        case "qtdTitulos": aVal = a.qtdTitulos; bVal = b.qtdTitulos; break;
        case "ticketMedio": aVal = parseFloat(a.ticketMedio); bVal = parseFloat(b.ticketMedio); break;
        case "ultimaCompra": aVal = a.ultimaCompra || ""; bVal = b.ultimaCompra || ""; break;
        case "mesesComCompra": aVal = a.mesesComCompra; bVal = b.mesesComCompra; break;
        case "mediaAtraso": aVal = parseFloat(a.mediaAtraso); bVal = parseFloat(b.mediaAtraso); break;
        default: aVal = 0; bVal = 0;
      }
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "desc" ? bVal - aVal : aVal - bVal;
      }
      return sortDir === "desc" ? String(bVal).localeCompare(String(aVal)) : String(aVal).localeCompare(String(bVal));
    });
    return sorted;
  }, [clientes, sortField, sortDir]);

  const handleSort = (field: ClientSortField) => {
    if (sortField === field) setSortDir(sortDir === "desc" ? "asc" : "desc");
    else { setSortField(field); setSortDir("desc"); }
  };

  if (loadingDetalhe || loadingClientes) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground font-medium tracking-wide uppercase">Carregando vendedor...</span>
        </motion.div>
      </div>
    );
  }

  const totalValor = parseFloat(kpis?.totalValor || "0");
  const totalPago = parseFloat(kpis?.totalPago || "0");
  const taxaRecebimento = totalValor > 0 ? (totalPago / totalValor) * 100 : 0;
  const mediaAtraso = Math.round(parseFloat(kpis?.mediaAtraso || "0") * 10) / 10;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/">
                <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                  Dashboard
                </button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  {vendedorNome}
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5 uppercase tracking-wider">
                  Desempenho do Vendedor
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={anoFilter} onValueChange={setAnoFilter}>
                <SelectTrigger className="w-[150px] h-8 text-xs bg-background">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os anos</SelectItem>
                  {(anosQuery.data || []).map((a: string) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <KPISmall icon={<DollarSign className="w-4 h-4" />} label="Faturado" value={formatCurrency(totalValor)} />
          <KPISmall icon={<TrendingUp className="w-4 h-4" />} label="Recebido" value={formatCurrency(totalPago)} badge={formatPercent(taxaRecebimento)} badgeColor={taxaRecebimento >= 98 ? "green" : taxaRecebimento >= 90 ? "blue" : "orange"} />
          <KPISmall icon={<Users className="w-4 h-4" />} label="Clientes" value={formatNumber(kpis?.qtdClientes || 0)} sub={`${kpis?.qtdCidades || 0} cidades`} />
          <KPISmall icon={<ShoppingCart className="w-4 h-4" />} label="Títulos" value={formatNumber(kpis?.qtdTitulos || 0)} sub={`Ticket: ${formatCurrency(totalValor / (kpis?.qtdTitulos || 1))}`} />
          <KPISmall icon={<Clock className="w-4 h-4" />} label="Atraso Médio" value={`${mediaAtraso}d`} badge={`${kpis?.titulosAtrasados || 0} atrasados`} badgeColor={mediaAtraso <= 0 ? "green" : mediaAtraso <= 5 ? "blue" : "orange"} />
        </div>

        {/* Evolução Mensal */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="bg-card border border-border rounded-lg p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">Evolução Mensal</h3>
          <p className="text-xs text-muted-foreground mb-4">Faturamento e recebimento ao longo do tempo</p>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={evolucao}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="faturado" name="Faturado" stroke="#0F4C75" fill="#0F4C75" fillOpacity={0.15} strokeWidth={2} />
              <Area type="monotone" dataKey="recebido" name="Recebido" stroke="#2D6A4F" fill="#2D6A4F" fillOpacity={0.1} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Clientes Table */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-5 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Clientes do Vendedor</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {sortedClientes.length} clientes · Clique no nome para ver o histórico completo
                </p>
              </div>
              <Users className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
          <ScrollArea className="max-h-[600px]">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground uppercase tracking-wider">#</th>
                    <SortTh field="cliente" label="Cliente" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground uppercase tracking-wider">Cidade</th>
                    <SortTh field="totalValor" label="Faturado" sortField={sortField} sortDir={sortDir} onSort={handleSort} align="right" />
                    <SortTh field="totalPago" label="Recebido" sortField={sortField} sortDir={sortDir} onSort={handleSort} align="right" />
                    <SortTh field="qtdTitulos" label="Títulos" sortField={sortField} sortDir={sortDir} onSort={handleSort} align="right" />
                    <SortTh field="ticketMedio" label="Ticket Médio" sortField={sortField} sortDir={sortDir} onSort={handleSort} align="right" />
                    <SortTh field="ultimaCompra" label="Última Compra" sortField={sortField} sortDir={sortDir} onSort={handleSort} align="right" />
                    <SortTh field="mesesComCompra" label="Frequência" sortField={sortField} sortDir={sortDir} onSort={handleSort} align="center" />
                    <SortTh field="mediaAtraso" label="Atraso" sortField={sortField} sortDir={sortDir} onSort={handleSort} align="right" />
                  </tr>
                </thead>
                <tbody>
                  {sortedClientes.map((c: any, i: number) => {
                    const freq = frequenciaLabel(c.mesesComCompra, totalMesesPeriodo);
                    const atraso = Math.round(parseFloat(c.mediaAtraso) * 10) / 10;
                    return (
                      <tr key={c.cliente + i} className="border-t border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-3 text-muted-foreground">{i + 1}</td>
                        <td className="py-2.5 px-3">
                          <Link href={`/cliente/${encodeURIComponent(c.cliente || "")}?vendedor=${encodeURIComponent(vendedorNome)}`}>
                            <span className="text-primary hover:underline cursor-pointer font-medium">
                              {(c.cliente || "N/D").length > 35 ? (c.cliente || "N/D").substring(0, 35) + "…" : c.cliente || "N/D"}
                            </span>
                          </Link>
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground">{c.cidade || "N/D"}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(parseFloat(c.totalValor))}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(parseFloat(c.totalPago))}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{c.qtdTitulos}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(parseFloat(c.ticketMedio))}</td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-mono text-foreground">{c.ultimaCompra || "N/D"}</span>
                            <span className="text-[10px] text-muted-foreground">{diasDesde(c.ultimaCompra)}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${freq.cor}`}>
                              {freq.label}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {c.mesesComCompra} {c.mesesComCompra === 1 ? "mês" : "meses"}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right">
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
            UNIX PACK Embalagens Flexíveis — Desempenho do Vendedor
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

function SortTh({ field, label, sortField, sortDir, onSort, align = "left" }: {
  field: ClientSortField; label: string; sortField: ClientSortField; sortDir: "asc" | "desc";
  onSort: (f: ClientSortField) => void; align?: "left" | "right" | "center";
}) {
  const isActive = sortField === field;
  const alignCls = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return (
    <th onClick={() => onSort(field)} className={`py-2.5 px-3 font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none ${alignCls} ${isActive ? "text-foreground" : ""}`}>
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive && <ArrowUpDown className="w-3 h-3" style={{ transform: sortDir === "asc" ? "scaleY(-1)" : undefined }} />}
      </span>
    </th>
  );
}
