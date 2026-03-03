import { useMemo } from "react";
import { trpc } from "@/lib/trpc";

export interface ContaRecord {
  id: number;
  cont: string;
  situacao: string | null;
  parcela: string;
  dtaVecto: string | null;
  valor: string | null;
  dtaPagto: string | null;
  valorPago: string | null;
  desconto: string | null;
  razaoCli: string | null;
  cidade: string | null;
  descricao: string | null;
  razao: string | null;
  vendedor: string | null;
  codEquipe: string | null;
  codEmpresa: string;
  atrasoDias: number | null;
}

export interface VendedorStats {
  nome: string;
  totalValor: number;
  totalPago: number;
  totalDesconto: number;
  qtdTitulos: number;
  qtdClientes: number;
  qtdCidades: number;
  mediaAtraso: number;
  titulosEmDia: number;
  titulosAtrasados: number;
  titulosAntecipados: number;
  taxaRecebimento: number;
  valorMedio: number;
}

export interface MonthlyData {
  mes: string;
  mesLabel: string;
  valor: number;
  valorPago: number;
  qtd: number;
}

// Parse decimal strings from DB to numbers
function toNum(val: string | null | undefined): number {
  if (!val) return 0;
  return parseFloat(val) || 0;
}

export function useData(filters?: {
  vendedor?: string;
  mes?: string;
  cidade?: string;
  ano?: string;
}) {
  const input = useMemo(() => ({
    vendedor: filters?.vendedor && filters.vendedor !== "todos" ? filters.vendedor : undefined,
    mes: filters?.mes && filters.mes !== "todos" ? filters.mes : undefined,
    cidade: filters?.cidade && filters.cidade !== "todos" ? filters.cidade : undefined,
    ano: filters?.ano && filters.ano !== "todos" ? filters.ano : undefined,
  }), [filters?.vendedor, filters?.mes, filters?.cidade, filters?.ano]);

  const { data, isLoading, error } = trpc.contas.list.useQuery(input);

  const records: ContaRecord[] = useMemo(() => {
    if (!data) return [];
    return data.map((r: any) => ({
      id: r.id,
      cont: r.cont,
      situacao: r.situacao,
      parcela: r.parcela,
      dtaVecto: r.dtaVecto,
      valor: r.valor,
      dtaPagto: r.dtaPagto,
      valorPago: r.valorPago,
      desconto: r.desconto,
      razaoCli: r.razaoCli,
      cidade: r.cidade,
      descricao: r.descricao,
      razao: r.razao,
      vendedor: r.vendedor,
      codEquipe: r.codEquipe,
      codEmpresa: r.codEmpresa,
      atrasoDias: r.atrasoDias,
    }));
  }, [data]);

  return { records, loading: isLoading, error: error?.message || null };
}

export function useVendedores() {
  return trpc.contas.vendedores.useQuery();
}

export function useCidades() {
  return trpc.contas.cidades.useQuery();
}

export function useAnos() {
  return trpc.contas.anos.useQuery();
}

export function useRelatorioMensal(filters?: { vendedor?: string; ano?: string }) {
  const input = useMemo(() => ({
    vendedor: filters?.vendedor && filters.vendedor !== "todos" ? filters.vendedor : undefined,
    ano: filters?.ano && filters.ano !== "todos" ? filters.ano : undefined,
  }), [filters?.vendedor, filters?.ano]);

  return trpc.contas.relatorioMensal.useQuery(input);
}

export function useTotalRegistros() {
  return trpc.contas.totalRegistros.useQuery();
}

export function calcVendedorStats(records: ContaRecord[]): VendedorStats[] {
  const map = new Map<string, ContaRecord[]>();

  for (const r of records) {
    if (!r.vendedor) continue;
    const arr = map.get(r.vendedor) || [];
    arr.push(r);
    map.set(r.vendedor, arr);
  }

  const stats: VendedorStats[] = [];

  for (const [nome, recs] of Array.from(map.entries())) {
    const totalValor = recs.reduce((s: number, r: ContaRecord) => s + toNum(r.valor), 0);
    const totalPago = recs.reduce((s: number, r: ContaRecord) => s + toNum(r.valorPago), 0);
    const totalDesconto = recs.reduce((s: number, r: ContaRecord) => s + toNum(r.desconto), 0);
    const clientes = new Set(recs.map((r: ContaRecord) => r.razaoCli).filter(Boolean));
    const cidades = new Set(recs.map((r: ContaRecord) => r.cidade).filter(Boolean));

    const comAtraso = recs.filter((r: ContaRecord) => r.atrasoDias !== null);
    const mediaAtraso =
      comAtraso.length > 0
        ? comAtraso.reduce((s: number, r: ContaRecord) => s + (r.atrasoDias || 0), 0) / comAtraso.length
        : 0;

    const titulosEmDia = recs.filter((r: ContaRecord) => r.atrasoDias !== null && r.atrasoDias === 0).length;
    const titulosAtrasados = recs.filter((r: ContaRecord) => r.atrasoDias !== null && r.atrasoDias > 0).length;
    const titulosAntecipados = recs.filter((r: ContaRecord) => r.atrasoDias !== null && r.atrasoDias < 0).length;

    stats.push({
      nome,
      totalValor,
      totalPago,
      totalDesconto,
      qtdTitulos: recs.length,
      qtdClientes: clientes.size,
      qtdCidades: cidades.size,
      mediaAtraso: Math.round(mediaAtraso * 10) / 10,
      titulosEmDia,
      titulosAtrasados,
      titulosAntecipados,
      taxaRecebimento: totalValor > 0 ? (totalPago / totalValor) * 100 : 0,
      valorMedio: recs.length > 0 ? totalValor / recs.length : 0,
    });
  }

  return stats.sort((a, b) => b.totalValor - a.totalValor);
}

export function calcMonthlyData(records: ContaRecord[]): MonthlyData[] {
  const map = new Map<string, { valor: number; valorPago: number; qtd: number }>();
  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  for (const r of records) {
    if (!r.dtaVecto) continue;
    const mes = r.dtaVecto.substring(0, 7);
    const existing = map.get(mes) || { valor: 0, valorPago: 0, qtd: 0 };
    existing.valor += toNum(r.valor);
    existing.valorPago += toNum(r.valorPago);
    existing.qtd += 1;
    map.set(mes, existing);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, data]) => {
      const monthIdx = parseInt(mes.split("-")[1]) - 1;
      return {
        mes,
        mesLabel: meses[monthIdx] || mes,
        valor: Math.round(data.valor * 100) / 100,
        valorPago: Math.round(data.valorPago * 100) / 100,
        qtd: data.qtd,
      };
    });
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}
