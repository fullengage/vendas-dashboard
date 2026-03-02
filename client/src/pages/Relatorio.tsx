/**
 * Relatório Mensal — Detalhamento por mês e vendedor
 */
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  useRelatorioMensal,
  useVendedores,
  useAnos,
  formatCurrency,
  formatNumber,
} from "@/hooks/useData";
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
  Legend,
  LineChart,
  Line,
} from "recharts";
import { ArrowLeft, Calendar, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

const mesesNomes = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const mesesAbrev = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez"
];

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
            {typeof entry.value === "number" && entry.name !== "Títulos"
              ? formatCurrency(entry.value)
              : formatNumber(entry.value)}
          </span>
        </p>
      ))}
    </div>
  );
}

export default function Relatorio() {
  const [vendedorFilter, setVendedorFilter] = useState("todos");
  const [anoFilter, setAnoFilter] = useState("todos");

  const filters = useMemo(() => ({
    vendedor: vendedorFilter,
    ano: anoFilter,
  }), [vendedorFilter, anoFilter]);

  const { data: relatorio, isLoading } = useRelatorioMensal(filters);
  const { data: vendedores } = useVendedores();
  const { data: anos } = useAnos();

  // Process relatorio data for charts
  const chartData = useMemo(() => {
    if (!relatorio) return [];
    return relatorio.map((r: any) => {
      const monthIdx = parseInt(r.mes.split("-")[1]) - 1;
      return {
        mes: r.mes,
        mesLabel: `${mesesAbrev[monthIdx]} ${r.mes.split("-")[0].slice(2)}`,
        mesNome: `${mesesNomes[monthIdx]} ${r.mes.split("-")[0]}`,
        totalValor: parseFloat(r.totalValor) || 0,
        totalPago: parseFloat(r.totalPago) || 0,
        totalDesconto: parseFloat(r.totalDesconto) || 0,
        qtdTitulos: r.qtdTitulos || 0,
      };
    });
  }, [relatorio]);

  // Calculate totals
  const totals = useMemo(() => {
    return chartData.reduce((acc: any, r: any) => ({
      totalValor: acc.totalValor + r.totalValor,
      totalPago: acc.totalPago + r.totalPago,
      totalDesconto: acc.totalDesconto + r.totalDesconto,
      qtdTitulos: acc.qtdTitulos + r.qtdTitulos,
    }), { totalValor: 0, totalPago: 0, totalDesconto: 0, qtdTitulos: 0 });
  }, [chartData]);

  // Month-over-month growth
  const growthData = useMemo(() => {
    return chartData.map((r: any, i: number) => {
      const prev = i > 0 ? chartData[i - 1] : null;
      const growth = prev && prev.totalValor > 0
        ? ((r.totalValor - prev.totalValor) / prev.totalValor) * 100
        : 0;
      return { ...r, growth: Math.round(growth * 10) / 10 };
    });
  }, [chartData]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="sm" className="h-8">
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Voltar
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Relatório Mensal
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5 uppercase tracking-wider">
                  Análise detalhada por mês
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
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
            </div>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        {/* Summary KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-lg p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Faturado</p>
            <p className="text-lg font-bold text-foreground mt-1 font-mono">{formatCurrency(totals.totalValor)}</p>
            <p className="text-[10px] text-muted-foreground">{chartData.length} meses</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-card border border-border rounded-lg p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Recebido</p>
            <p className="text-lg font-bold text-foreground mt-1 font-mono">{formatCurrency(totals.totalPago)}</p>
            <p className="text-[10px] text-muted-foreground">
              Taxa: {totals.totalValor > 0 ? ((totals.totalPago / totals.totalValor) * 100).toFixed(1) : 0}%
            </p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card border border-border rounded-lg p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Descontos</p>
            <p className="text-lg font-bold text-foreground mt-1 font-mono">{formatCurrency(totals.totalDesconto)}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-card border border-border rounded-lg p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Títulos</p>
            <p className="text-lg font-bold text-foreground mt-1 font-mono">{formatNumber(totals.qtdTitulos)}</p>
            <p className="text-[10px] text-muted-foreground">
              Média: {chartData.length > 0 ? formatNumber(Math.round(totals.qtdTitulos / chartData.length)) : 0}/mês
            </p>
          </motion.div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-lg p-5">
            <h3 className="text-sm font-semibold text-foreground mb-1">Faturamento vs Recebimento</h3>
            <p className="text-xs text-muted-foreground mb-4">Comparativo mensal em R$</p>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="mesLabel" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="totalValor" name="Faturado" fill="#0F4C75" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="totalPago" name="Recebido" fill="#2D6A4F" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card border border-border rounded-lg p-5">
            <h3 className="text-sm font-semibold text-foreground mb-1">Variação Mensal</h3>
            <p className="text-xs text-muted-foreground mb-4">Crescimento % mês a mês</p>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="mesLabel" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} />
                <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, "Variação"]} />
                <Line type="monotone" dataKey="growth" name="Variação" stroke="#E85D04" strokeWidth={2.5} dot={{ r: 4, fill: "#E85D04" }} />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Monthly Table */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-5 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Detalhamento Mensal</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Valores consolidados por mês</p>
          </div>
          <ScrollArea className="max-h-[600px]">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left py-2.5 px-4 font-semibold text-muted-foreground uppercase tracking-wider">Mês</th>
                    <th className="text-right py-2.5 px-4 font-semibold text-muted-foreground uppercase tracking-wider">Faturado</th>
                    <th className="text-right py-2.5 px-4 font-semibold text-muted-foreground uppercase tracking-wider">Recebido</th>
                    <th className="text-right py-2.5 px-4 font-semibold text-muted-foreground uppercase tracking-wider">Taxa</th>
                    <th className="text-right py-2.5 px-4 font-semibold text-muted-foreground uppercase tracking-wider">Descontos</th>
                    <th className="text-right py-2.5 px-4 font-semibold text-muted-foreground uppercase tracking-wider">Títulos</th>
                    <th className="text-right py-2.5 px-4 font-semibold text-muted-foreground uppercase tracking-wider">Ticket Médio</th>
                    <th className="text-right py-2.5 px-4 font-semibold text-muted-foreground uppercase tracking-wider">Variação</th>
                  </tr>
                </thead>
                <tbody>
                  {growthData.map((r: any, i: number) => {
                    const taxa = r.totalValor > 0 ? (r.totalPago / r.totalValor) * 100 : 0;
                    const ticketMedio = r.qtdTitulos > 0 ? r.totalValor / r.qtdTitulos : 0;
                    return (
                      <tr key={r.mes} className="border-t border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-4 font-medium text-foreground">{r.mesNome}</td>
                        <td className="py-2.5 px-4 text-right font-mono">{formatCurrency(r.totalValor)}</td>
                        <td className="py-2.5 px-4 text-right font-mono">{formatCurrency(r.totalPago)}</td>
                        <td className="py-2.5 px-4 text-right">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${taxa >= 98 ? "bg-green-ok-light text-green-ok" : taxa >= 90 ? "bg-petrol-bg text-petrol" : "bg-orange-alert-light text-orange-alert"}`}>
                            {taxa.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono">{formatCurrency(r.totalDesconto)}</td>
                        <td className="py-2.5 px-4 text-right font-mono">{formatNumber(r.qtdTitulos)}</td>
                        <td className="py-2.5 px-4 text-right font-mono">{formatCurrency(ticketMedio)}</td>
                        <td className="py-2.5 px-4 text-right">
                          {i === 0 ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${r.growth >= 0 ? "text-green-ok" : "text-orange-alert"}`}>
                              {r.growth >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                              {r.growth >= 0 ? "+" : ""}{r.growth}%
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Totals row */}
                  <tr className="border-t-2 border-border bg-muted/30 font-semibold">
                    <td className="py-3 px-4 text-foreground uppercase text-[10px] tracking-wider">Total</td>
                    <td className="py-3 px-4 text-right font-mono text-foreground">{formatCurrency(totals.totalValor)}</td>
                    <td className="py-3 px-4 text-right font-mono text-foreground">{formatCurrency(totals.totalPago)}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary">
                        {totals.totalValor > 0 ? ((totals.totalPago / totals.totalValor) * 100).toFixed(1) : 0}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-foreground">{formatCurrency(totals.totalDesconto)}</td>
                    <td className="py-3 px-4 text-right font-mono text-foreground">{formatNumber(totals.qtdTitulos)}</td>
                    <td className="py-3 px-4 text-right font-mono text-foreground">
                      {formatCurrency(totals.qtdTitulos > 0 ? totals.totalValor / totals.qtdTitulos : 0)}
                    </td>
                    <td className="py-3 px-4 text-right text-muted-foreground">—</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </ScrollArea>
        </motion.div>
      </main>
    </div>
  );
}
