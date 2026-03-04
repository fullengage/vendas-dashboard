/**
 * Dashboard de Vendas — Corporate Analytics / Swiss Industrial Design
 * Dados do banco de dados via tRPC
 */
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  useData,
  useVendedores,
  useCidades,
  useAnos,
  useRelatorioMensal,
  useTotalRegistros,
  calcVendedorStats,
  calcMonthlyData,
  formatCurrency,
  formatNumber,
  formatPercent,
  type VendedorStats,
  type ContaRecord,
} from "@/hooks/useData";
import KPICard from "@/components/KPICard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardHeader, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Area,
  AreaChart,
} from "recharts";
import {
  DollarSign,
  Users,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  FileText,
  ArrowUpDown,
  Upload,
  Calendar,
  Database,
  Globe,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

const CHART_COLORS = [
  "#0F4C75", "#2D6A4F", "#E85D04", "#6B4C9A", "#C45D3E",
  "#1B7A8C", "#8B6914", "#4A7C59", "#9B4DCA", "#D4763D",
  "#2E86AB", "#A23B72", "#F18F01", "#3C6E71", "#D64045",
];

function toNum(val: string | null | undefined): number {
  if (!val) return 0;
  return parseFloat(val) || 0;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-card border border-border rounded-md shadow-lg p-3 text-xs">
      <p className="font-medium text-foreground mb-1.5">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full inline-block"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-mono text-foreground">
            {typeof entry.value === "number" ? formatCurrency(entry.value) : entry.value}
          </span>
        </p>
      ))}
    </div>
  );
}

function CustomTooltipQtd({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-card border border-border rounded-md shadow-lg p-3 text-xs">
      <p className="font-medium text-foreground mb-1.5">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full inline-block"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-mono text-foreground">
            {formatNumber(entry.value)}
          </span>
        </p>
      ))}
    </div>
  );
}

export default function Home() {
  const [vendedorFilter, setVendedorFilter] = useState("todos");
  const [mesFilter, setMesFilter] = useState("todos");
  const [cidadeFilter, setCidadeFilter] = useState("todos");
  const [anoFilter, setAnoFilter] = useState("todos");
  const [sortField, setSortField] = useState<keyof VendedorStats>("totalValor");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const filters = useMemo(() => ({
    vendedor: vendedorFilter,
    mes: mesFilter,
    cidade: cidadeFilter,
    ano: anoFilter,
  }), [vendedorFilter, mesFilter, cidadeFilter, anoFilter]);

  const { records, loading, error } = useData(filters);
  const { data: vendedores } = useVendedores();
  const { data: cidades } = useCidades();
  const { data: anos } = useAnos();
  const { data: totalRegistros } = useTotalRegistros();

  const vendedorStats = useMemo(() => calcVendedorStats(records), [records]);
  const monthlyData = useMemo(() => calcMonthlyData(records), [records]);

  // KPI totals
  const totalValor = useMemo(() => records.reduce((s: number, r: ContaRecord) => s + toNum(r.valor), 0), [records]);
  const totalPago = useMemo(() => records.reduce((s: number, r: ContaRecord) => s + toNum(r.valorPago), 0), [records]);
  const qtdTitulos = records.length;
  const clientesUnicos = useMemo(
    () => new Set(records.map((r: ContaRecord) => r.razaoCli).filter(Boolean)).size,
    [records]
  );
  const mediaAtraso = useMemo(() => {
    const comAtraso = records.filter((r: ContaRecord) => r.atrasoDias !== null);
    return comAtraso.length > 0
      ? comAtraso.reduce((s: number, r: ContaRecord) => s + (r.atrasoDias || 0), 0) / comAtraso.length
      : 0;
  }, [records]);
  const titulosAtrasados = useMemo(
    () => records.filter((r: ContaRecord) => r.atrasoDias !== null && r.atrasoDias > 0).length,
    [records]
  );
  const taxaRecebimento = totalValor > 0 ? (totalPago / totalValor) * 100 : 0;

  // Sorted vendedor stats
  const sortedStats = useMemo(() => {
    const sorted = [...vendedorStats];
    sorted.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "desc" ? bVal - aVal : aVal - bVal;
      }
      return sortDir === "desc"
        ? String(bVal).localeCompare(String(aVal))
        : String(aVal).localeCompare(String(bVal));
    });
    return sorted;
  }, [vendedorStats, sortField, sortDir]);

  // Pagination
  const totalPages = Math.ceil(sortedStats.length / itemsPerPage);
  const paginatedStats = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedStats.slice(startIndex, endIndex);
  }, [sortedStats, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [vendedorFilter, mesFilter, cidadeFilter, anoFilter, sortField, sortDir]);

  const top10 = useMemo(() => vendedorStats.slice(0, 10), [vendedorStats]);

  // Pie data for payment types
  const pieData = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of records) {
      if (!r.descricao) continue;
      map.set(r.descricao, (map.get(r.descricao) || 0) + toNum(r.valor));
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value);
  }, [records]);

  // Top 10 clientes
  const topClientes = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of records) {
      if (!r.razaoCli) continue;
      map.set(r.razaoCli, (map.get(r.razaoCli) || 0) + toNum(r.valor));
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [records]);

  // Atraso distribution
  const atrasoDistrib = useMemo(() => {
    const buckets = [
      { label: "Antecipado", min: -Infinity, max: -1, count: 0, valor: 0 },
      { label: "Em dia", min: 0, max: 0, count: 0, valor: 0 },
      { label: "1-7 dias", min: 1, max: 7, count: 0, valor: 0 },
      { label: "8-15 dias", min: 8, max: 15, count: 0, valor: 0 },
      { label: "16-30 dias", min: 16, max: 30, count: 0, valor: 0 },
      { label: "31-60 dias", min: 31, max: 60, count: 0, valor: 0 },
      { label: "60+ dias", min: 61, max: Infinity, count: 0, valor: 0 },
    ];
    for (const r of records) {
      if (r.atrasoDias === null) continue;
      for (const b of buckets) {
        if (r.atrasoDias >= b.min && r.atrasoDias <= b.max) {
          b.count++;
          b.valor += toNum(r.valor);
          break;
        }
      }
    }
    return buckets;
  }, [records]);

  const handleSort = (field: keyof VendedorStats) => {
    if (sortField === field) {
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const hasFilters = vendedorFilter !== "todos" || mesFilter !== "todos" || cidadeFilter !== "todos" || anoFilter !== "todos";

  // Build meses list from monthlyData
  const mesesNomes = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground font-medium tracking-wide uppercase">
            Carregando dados...
          </span>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-destructive text-sm">Erro ao carregar dados: {error}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="shrink-0 border-b border-border bg-card sticky top-0 z-50">
        <div className="container py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-foreground tracking-tight">
                  UNIX PACK
                  <span className="text-muted-foreground font-normal ml-2 text-base">
                    Embalagens Flexíveis
                  </span>
                </h1>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  <Database className="w-3 h-3" />
                  {formatNumber(totalRegistros ?? 0)} registros
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 uppercase tracking-wider">
                Contas a Receber — Dados do Banco
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Link href="/relatorio">
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  <Calendar className="w-3.5 h-3.5 mr-1.5" />
                  Relatório Mensal
                </Button>
              </Link>
              <Link href="/relatorio-regiao">
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  <Globe className="w-3.5 h-3.5 mr-1.5" />
                  Região / Estado
                </Button>
              </Link>
              <Link href="/clientes-inativos">
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                  Clientes Inativos
                </Button>
              </Link>
              <Link href="/upload">
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  Importar CSV
                </Button>
              </Link>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Select value={anoFilter} onValueChange={setAnoFilter}>
              <SelectTrigger className="w-[130px] h-8 text-xs bg-background">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os anos</SelectItem>
                {(anos || []).map((a: string) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={vendedorFilter} onValueChange={setVendedorFilter}>
              <SelectTrigger className="w-[200px] h-8 text-xs bg-background">
                <SelectValue placeholder="Vendedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os vendedores</SelectItem>
                {(vendedores || []).map((v: string) => (
                  <SelectItem key={v} value={v}>
                    {v.length > 28 ? v.substring(0, 28) + "…" : v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={cidadeFilter} onValueChange={setCidadeFilter}>
              <SelectTrigger className="w-[180px] h-8 text-xs bg-background">
                <SelectValue placeholder="Cidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as cidades</SelectItem>
                {(cidades || []).map((c: string) => (
                  <SelectItem key={c} value={c}>
                    {c.length > 25 ? c.substring(0, 25) + "…" : c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasFilters && (
              <button
                onClick={() => {
                  setVendedorFilter("todos");
                  setMesFilter("todos");
                  setCidadeFilter("todos");
                  setAnoFilter("todos");
                }}
                className="text-xs text-primary hover:text-primary/80 underline underline-offset-2 transition-colors"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="container py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <KPICard
            title="Total Faturado"
            value={formatCurrency(totalValor)}
            subtitle={`${formatNumber(qtdTitulos)} títulos`}
            icon={<DollarSign className="w-4 h-4" />}
            delay={0}
          />
          <KPICard
            title="Total Recebido"
            value={formatCurrency(totalPago)}
            subtitle={`Taxa: ${formatPercent(taxaRecebimento)}`}
            icon={<CheckCircle className="w-4 h-4" />}
            trend={taxaRecebimento >= 95 ? "up" : taxaRecebimento >= 85 ? "neutral" : "down"}
            trendValue={formatPercent(taxaRecebimento)}
            accentColor="bg-green-ok-light text-green-ok"
            delay={0.05}
          />
          <KPICard
            title="Clientes Ativos"
            value={formatNumber(clientesUnicos)}
            subtitle={`${vendedorStats.length} vendedores`}
            icon={<Users className="w-4 h-4" />}
            delay={0.1}
          />
          <KPICard
            title="Atraso Médio"
            value={`${Math.round(mediaAtraso)} ${Math.round(mediaAtraso) === 1 ? 'dia' : 'dias'}`}
            subtitle={`${formatNumber(titulosAtrasados)} títulos atrasados`}
            icon={<Clock className="w-4 h-4" />}
            trend={mediaAtraso <= 5 ? "up" : mediaAtraso <= 15 ? "neutral" : "down"}
            trendValue={`${Math.round(mediaAtraso)}d`}
            accentColor={
              mediaAtraso <= 5
                ? "bg-green-ok-light text-green-ok"
                : "bg-orange-alert-light text-orange-alert"
            }
            delay={0.15}
          />
        </div>

        {/* Charts Section */}
        <Tabs defaultValue="evolucao" className="space-y-4">
          <TabsList className="bg-card border border-border h-9">
            <TabsTrigger value="evolucao" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
              Evolução Mensal
            </TabsTrigger>
            <TabsTrigger value="ranking" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
              Ranking
            </TabsTrigger>
            <TabsTrigger value="clientes" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="w-3.5 h-3.5 mr-1.5" />
              Top Clientes
            </TabsTrigger>
            <TabsTrigger value="atraso" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
              Inadimplência
            </TabsTrigger>
          </TabsList>

          {/* Evolução Mensal */}
          <TabsContent value="evolucao">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="lg:col-span-2 bg-card border border-border rounded-lg p-5"
              >
                <h3 className="text-sm font-semibold text-foreground mb-1">Faturamento vs Recebimento</h3>
                <p className="text-xs text-muted-foreground mb-4">Evolução mensal em R$</p>
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient id="gradValor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0F4C75" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#0F4C75" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradPago" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2D6A4F" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#2D6A4F" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="mesLabel"
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      axisLine={{ stroke: "var(--border)" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="valor" name="Faturado" stroke="#0F4C75" strokeWidth={2.5} fill="url(#gradValor)" />
                    <Area type="monotone" dataKey="valorPago" name="Recebido" stroke="#2D6A4F" strokeWidth={2} strokeDasharray="6 3" fill="url(#gradPago)" />
                  </AreaChart>
                </ResponsiveContainer>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="bg-card border border-border rounded-lg p-5"
              >
                <h3 className="text-sm font-semibold text-foreground mb-1">Formas de Pagamento</h3>
                <p className="text-xs text-muted-foreground mb-4">Distribuição por tipo</p>
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="45%" innerRadius={55} outerRadius={90} paddingAngle={2} dataKey="value">
                      {pieData.map((_: any, i: number) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: 10 }}
                      formatter={(value: string) => value.length > 18 ? value.substring(0, 18) + "…" : value}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </motion.div>
            </div>
          </TabsContent>

          {/* Ranking de Vendedores */}
          <TabsContent value="ranking">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="bg-card border border-border rounded-lg p-5"
              >
                <h3 className="text-sm font-semibold text-foreground mb-1">Top 10 Vendedores</h3>
                <p className="text-xs text-muted-foreground mb-4">Por valor faturado</p>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={top10} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="nome" width={140} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v: string) => v.length > 20 ? v.substring(0, 20) + "…" : v} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="totalValor" name="Faturado" fill="#0F4C75" radius={[0, 4, 4, 0]} barSize={18} />
                    <Bar dataKey="totalPago" name="Recebido" fill="#2D6A4F" radius={[0, 4, 4, 0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="bg-card border border-border rounded-lg p-5"
              >
                <h3 className="text-sm font-semibold text-foreground mb-1">Títulos por Vendedor</h3>
                <p className="text-xs text-muted-foreground mb-4">Quantidade de títulos emitidos</p>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={top10} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="nome" width={140} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v: string) => v.length > 20 ? v.substring(0, 20) + "…" : v} />
                    <Tooltip content={<CustomTooltipQtd />} />
                    <Bar dataKey="qtdTitulos" name="Títulos" fill="#6B4C9A" radius={[0, 4, 4, 0]} barSize={18} />
                    <Bar dataKey="qtdClientes" name="Clientes" fill="#C45D3E" radius={[0, 4, 4, 0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            </div>
          </TabsContent>

          {/* Top Clientes */}
          <TabsContent value="clientes">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="bg-card border border-border rounded-lg p-5"
            >
              <h3 className="text-sm font-semibold text-foreground mb-1">Top 10 Clientes</h3>
              <p className="text-xs text-muted-foreground mb-4">Por valor total faturado</p>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={topClientes} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={200} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v: string) => v.length > 30 ? v.substring(0, 30) + "…" : v} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Faturado" fill="#0F4C75" radius={[0, 4, 4, 0]} barSize={22}>
                    {topClientes.map((_: any, i: number) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          </TabsContent>

          {/* Inadimplência */}
          <TabsContent value="atraso">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="bg-card border border-border rounded-lg p-5"
              >
                <h3 className="text-sm font-semibold text-foreground mb-1">Distribuição de Atraso</h3>
                <p className="text-xs text-muted-foreground mb-4">Quantidade de títulos por faixa de atraso</p>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={atrasoDistrib}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltipQtd />} />
                    <Bar dataKey="count" name="Títulos" radius={[4, 4, 0, 0]} barSize={36}>
                      {atrasoDistrib.map((entry, i) => (
                        <Cell key={i} fill={entry.label === "Antecipado" ? "#2D6A4F" : entry.label === "Em dia" ? "#0F4C75" : i <= 3 ? "#E8A838" : "#E85D04"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="bg-card border border-border rounded-lg p-5"
              >
                <h3 className="text-sm font-semibold text-foreground mb-1">Valor por Faixa de Atraso</h3>
                <p className="text-xs text-muted-foreground mb-4">Valor total em R$ por faixa</p>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={atrasoDistrib}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="valor" name="Valor" radius={[4, 4, 0, 0]} barSize={36}>
                      {atrasoDistrib.map((entry, i) => (
                        <Cell key={i} fill={entry.label === "Antecipado" ? "#2D6A4F" : entry.label === "Em dia" ? "#0F4C75" : i <= 3 ? "#E8A838" : "#E85D04"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Vendedor Table */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card className="border border-border/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm">Desempenho por Vendedor</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {vendedorStats.length} vendedores · Página {currentPage} de {totalPages} · Mostrando {paginatedStats.length} de {sortedStats.length}
                  </CardDescription>
                </div>
                <FileText className="w-4 h-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="border-t border-border overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead className="bg-muted/50 sticky top-0 z-10 border-b border-border">
                  <tr>
                    <th className="text-left py-2.5 px-4 font-semibold text-muted-foreground uppercase tracking-wider">#</th>
                    <SortHeader field="nome" label="Vendedor" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader field="totalValor" label="Faturado" sortField={sortField} sortDir={sortDir} onSort={handleSort} align="right" />
                    <SortHeader field="totalPago" label="Recebido" sortField={sortField} sortDir={sortDir} onSort={handleSort} align="right" />
                    <SortHeader field="taxaRecebimento" label="Taxa" sortField={sortField} sortDir={sortDir} onSort={handleSort} align="right" />
                    <SortHeader field="qtdTitulos" label="Títulos" sortField={sortField} sortDir={sortDir} onSort={handleSort} align="right" />
                    <SortHeader field="qtdClientes" label="Clientes" sortField={sortField} sortDir={sortDir} onSort={handleSort} align="right" />
                    <SortHeader field="valorMedio" label="Ticket Médio" sortField={sortField} sortDir={sortDir} onSort={handleSort} align="right" />
                    <SortHeader field="mediaAtraso" label="Atraso Médio" sortField={sortField} sortDir={sortDir} onSort={handleSort} align="right" />
                    <SortHeader field="titulosAtrasados" label="Atrasados" sortField={sortField} sortDir={sortDir} onSort={handleSort} align="right" />
                  </tr>
                </thead>
                <tbody>
                  {paginatedStats.map((v, idx) => {
                    const i = (currentPage - 1) * itemsPerPage + idx;
                    return (
                    <tr key={v.nome} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-4 text-muted-foreground">{i + 1}</td>
                      <td className="py-2.5 px-4 font-medium max-w-[200px] truncate" title={v.nome}>
                        <Link href={`/vendedor/${encodeURIComponent(v.nome)}`}>
                          <span className="text-primary hover:underline cursor-pointer">{v.nome}</span>
                        </Link>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono">{formatCurrency(v.totalValor)}</td>
                      <td className="py-2.5 px-4 text-right font-mono">{formatCurrency(v.totalPago)}</td>
                      <td className="py-2.5 px-4 text-right">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${v.taxaRecebimento >= 98 ? "bg-green-ok-light text-green-ok" : v.taxaRecebimento >= 90 ? "bg-petrol-bg text-petrol" : "bg-orange-alert-light text-orange-alert"}`}>
                          {formatPercent(v.taxaRecebimento)}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono">{v.qtdTitulos}</td>
                      <td className="py-2.5 px-4 text-right font-mono">{v.qtdClientes}</td>
                      <td className="py-2.5 px-4 text-right font-mono">{formatCurrency(v.valorMedio)}</td>
                      <td className="py-2.5 px-4 text-right">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${v.mediaAtraso <= 0 ? "bg-green-ok-light text-green-ok" : v.mediaAtraso <= 10 ? "bg-petrol-bg text-petrol" : "bg-orange-alert-light text-orange-alert"}`}>
                          {v.mediaAtraso}d
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono">
                        {v.titulosAtrasados > 0 ? (
                          <span className="text-orange-alert">{v.titulosAtrasados}</span>
                        ) : (
                          <span className="text-green-ok">0</span>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
              {totalPages > 1 && (
                <div className="p-4 border-t border-border flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, sortedStats.length)} de {sortedStats.length} vendedores
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrevPage}
                      disabled={currentPage === 1}
                      className="h-8 text-xs"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Anterior
                    </Button>
                    <div className="text-xs text-muted-foreground font-medium">
                      Página {currentPage} de {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages}
                      className="h-8 text-xs"
                    >
                      Próxima
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Footer */}
        <footer className="text-center py-4 border-t border-border">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
            UNIX PACK Embalagens Flexíveis — Dashboard de Vendas
          </p>
        </footer>
        </div>
      </main>
    </div>
  );
}

// Sort header component
function SortHeader({
  field, label, sortField, sortDir, onSort, align = "left",
}: {
  field: keyof VendedorStats;
  label: string;
  sortField: keyof VendedorStats;
  sortDir: "asc" | "desc";
  onSort: (field: keyof VendedorStats) => void;
  align?: "left" | "right";
}) {
  const isActive = sortField === field;
  return (
    <th
      onClick={() => onSort(field)}
      className={`py-2.5 px-4 font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none ${align === "right" ? "text-right" : "text-left"} ${isActive ? "text-foreground" : ""}`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive && <ArrowUpDown className="w-3 h-3" style={{ transform: sortDir === "asc" ? "scaleY(-1)" : undefined }} />}
      </span>
    </th>
  );
}
