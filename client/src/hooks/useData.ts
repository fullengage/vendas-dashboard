import { useState, useEffect, useMemo } from "react";

export interface Record {
  cont: string;
  situacao: string;
  num_nf: string;
  cod_pessoa: string;
  parcela: string;
  dta_vecto: string | null;
  valor: number;
  dta_pagto: string | null;
  valor_pago: number;
  tipo_doc: string;
  desconto: number;
  dta_emissao: string | null;
  tipo_pagto: string;
  sit_doc: string;
  cliente: string;
  cidade: string;
  descricao: string;
  razao: string;
  vendedor: string;
  cod_equipe: string;
  atraso_dias: number | null;
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

export function useData() {
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/data.json")
      .then((res) => res.json())
      .then((data: Record[]) => {
        setRecords(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return { records, loading, error };
}

export function useFilteredData(records: Record[], vendedorFilter: string, mesFilter: string, cidadeFilter: string) {
  return useMemo(() => {
    let filtered = records;
    
    if (vendedorFilter && vendedorFilter !== "todos") {
      filtered = filtered.filter((r) => r.vendedor === vendedorFilter);
    }
    if (mesFilter && mesFilter !== "todos") {
      filtered = filtered.filter((r) => {
        if (!r.dta_vecto) return false;
        return r.dta_vecto.substring(0, 7) === mesFilter;
      });
    }
    if (cidadeFilter && cidadeFilter !== "todos") {
      filtered = filtered.filter((r) => r.cidade === cidadeFilter);
    }
    return filtered;
  }, [records, vendedorFilter, mesFilter, cidadeFilter]);
}

export function calcVendedorStats(records: Record[]): VendedorStats[] {
  const map = new Map<string, Record[]>();
  
  for (const r of records) {
    if (!r.vendedor) continue;
    const arr = map.get(r.vendedor) || [];
    arr.push(r);
    map.set(r.vendedor, arr);
  }

  const stats: VendedorStats[] = [];
  
  for (const [nome, recs] of Array.from(map.entries())) {
    const totalValor = recs.reduce((s: number, r: Record) => s + r.valor, 0);
    const totalPago = recs.reduce((s: number, r: Record) => s + r.valor_pago, 0);
    const totalDesconto = recs.reduce((s: number, r: Record) => s + r.desconto, 0);
    const clientes = new Set(recs.map((r: Record) => r.cliente).filter(Boolean));
    const cidades = new Set(recs.map((r: Record) => r.cidade).filter(Boolean));
    
    const comAtraso = recs.filter((r: Record) => r.atraso_dias !== null);
    const mediaAtraso = comAtraso.length > 0
      ? comAtraso.reduce((s: number, r: Record) => s + (r.atraso_dias || 0), 0) / comAtraso.length
      : 0;
    
    const titulosEmDia = recs.filter((r: Record) => r.atraso_dias !== null && r.atraso_dias === 0).length;
    const titulosAtrasados = recs.filter((r: Record) => r.atraso_dias !== null && r.atraso_dias > 0).length;
    const titulosAntecipados = recs.filter((r: Record) => r.atraso_dias !== null && r.atraso_dias < 0).length;
    
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

export function calcMonthlyData(records: Record[]): MonthlyData[] {
  const map = new Map<string, { valor: number; valorPago: number; qtd: number }>();
  const meses = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez"
  ];

  for (const r of records) {
    if (!r.dta_vecto) continue;
    const mes = r.dta_vecto.substring(0, 7);
    const existing = map.get(mes) || { valor: 0, valorPago: 0, qtd: 0 };
    existing.valor += r.valor;
    existing.valorPago += r.valor_pago;
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

export function getUniqueVendedores(records: Record[]): string[] {
  return Array.from(new Set(records.map((r) => r.vendedor).filter(Boolean))).sort();
}

export function getUniqueMeses(records: Record[]): { value: string; label: string }[] {
  const mesesNomes = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  const meses = Array.from(new Set(records.map((r) => r.dta_vecto?.substring(0, 7)).filter((v): v is string => Boolean(v))));
  return meses.sort().map((m) => {
    const monthIdx = parseInt(m.split("-")[1]) - 1;
    return { value: m, label: `${mesesNomes[monthIdx]} ${m.split("-")[0]}` };
  });
}

export function getUniqueCidades(records: Record[]): string[] {
  return Array.from(new Set(records.map((r) => r.cidade).filter(Boolean))).sort();
}
