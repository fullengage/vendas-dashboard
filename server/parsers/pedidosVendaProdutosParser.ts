import { createHash } from "crypto";

/**
 * Parser para CSV de Pedidos de Venda x Produtos (período 2026)
 * - Encoding: ISO-8859-1
 * - Separador: ;
 * - Header está na linha 4 (índice 3)
 * - Colunas principais: COD_PEDIDO, COD_PROD, DESC_SAIDA, QTDE, VALOR_UNIT, SITUACAO, DTA_EMISSAO, etc.
 */

export interface PedidoVendaProdutoRow {
  SIT: string;
  CODIGO: string;
  NOME: string;
  APELIDO_EMP: string;
  QTDE_FATURADO: string;
  VALOR_TOTAL: string;
  COD_PEDIDO: string;
  COD_PROD: string;
  UNIDADE: string;
  QTDE: string;
  VALOR_UNIT: string;
  TOTAL_ITEM: string;
  VALOR_TOTAL_1: string;
  DESCONTO: string;
  SALDO: string;
  QTDE_FATURAR: string;
  LOTE: string;
  DTA_EMISSAO: string;
  DESC_SAIDA: string;
  COD_FAB: string;
  RAZAO: string;
  COD_PESSOA: string;
  DTA_ENTREGA: string;
  DTA_FATURAMENTO: string;
  CIDADE: string;
  COD_EMPRESA: string;
  ITEM: string;
  EQUIPE: string;
  DESC_SIT: string;
  SITUACAO: string;
  BLOQUEIO_BONIFICACAO: string;
  VALOR_PEDIDO_CALC: string;
  VALOR_PEDIDO: string;
  QTDE_PEDIDO: string;
  SALDO_PEDIDO: string;
  COEF1: string;
  COEF2: string;
  COEF1_SALDO: string;
  COEF2_SALDO: string;
  ITEM_SEM_PESAR: string;
  RETIRAR_NO_LOCAL: string;
  COD_EQUIPE: string;
  COD_STATUS: string;
  COD_MOTIVO_BAIXA: string;
  COD_USUARIO: string;
  NUM_SERIE: string;
  CONT_CFOP: string;
  CFOP: string;
  TIPO_FRETE: string;
  ESTOQUE: string;
  OBS: string;
  COMISSAO: string;
  TOTAL_FINAL: string;
  VLR_IPI: string;
  VLR_ICMS_SUBST_TRIB: string;
  APELIDO_BD: string;
  TIPO_FULLFILMENT: string;
  TOTAL_PED: string;
  ID_LOJA: string;
  DESC_LOJA: string;
  TIPO_DEVOL: string;
  VALOR_PEDIDO_TOTAL: string;
  QTDE_PRODUCAO: string;
  PEDIDO_RESTANTE: string;
  VALOR_PEDIDO_RESTANTE: string;
  COD_PEDIDO_ORIGEM: string;
  PEDIDO_STR_RESTANTE: string;
  VALOR_STR_RESTANTE: string;
  RESTANTE_ABERTO: string;
  PED_CFOP: string;
  PED_CONT_CFOP: string;
  LOCAL_ESTOQUE: string;
  FORMA_PAGTO: string;
  RATEIO_SUFRAMA: string;
  VLR_CUSTO_MEDIO: string;
  LSTPRECO: string;
  VLR_SUB_COMPRA: string;
  CONT: string;
  DESCRICAO_CAMPANHA: string;
  ALIQ_IPI: string;
  ALIQ_ICMS: string;
  CONT_OPERACAO: string;
  OPERACAO: string;
  [key: string]: string;
}

export interface ParsedPedidoVendaProduto {
  codPedido: string;
  codProd: string;
  descSaida: string;
  codPessoa: string;
  codUsuario: string;
  codEquipe: string;
  dtaEmissao: string;
  dtaEntrega: string;
  dtaFaturamento: string;
  unidade: string;
  qtde: number;
  valorUnit: number;
  totalItem: number;
  desconto: number;
  saldo: number;
  situacao: string;
  descSit: string;
  codStatus: string;
  formaPagto: string;
  lote: string;
  codFab: string;
  cidade: string;
  item: number;
  qtdeFaturado: number;
  qtdeFaturar: number;
  valorTotal: number;
  totalFinal: number;
  ipi: number;
  icmsSubstTrib: number;
}

/**
 * Converter string de número brasileiro (1.234,56) para número
 */
function parseNumber(str: string): number {
  if (!str || str.trim() === "") return 0;
  // Remove pontos (separador de milhares) e substitui vírgula por ponto
  return parseFloat(str.replace(/\./g, "").replace(",", "."));
}

/**
 * Converter data dd/mm/yyyy para yyyy-mm-dd
 */
function parseDate(str: string): string {
  if (!str || str.trim() === "") return "";
  const parts = str.split("/");
  if (parts.length !== 3) return "";
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

/**
 * Calcular hash SHA256 do arquivo
 */
export function calculateFileHashPedidosVendaProdutos(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

/**
 * Parser principal do CSV de Pedidos de Venda x Produtos
 */
export function parsePedidosVendaProdutosCSV(content: string): {
  pedidos: ParsedPedidoVendaProduto[];
  errors: Array<{ rowNumber: number; error: string; rawRow: string }>;
} {
  const lines = content.split("\n");
  const pedidos: ParsedPedidoVendaProduto[] = [];
  const errors: Array<{ rowNumber: number; error: string; rawRow: string }> = [];

  // Header está na linha 4 (índice 3)
  const headerLine = lines[3];
  if (!headerLine) {
    errors.push({
      rowNumber: 4,
      error: "Header não encontrado na linha 4",
      rawRow: "",
    });
    return { pedidos, errors };
  }

  const headers = headerLine.split(";").map((h) => h.trim());

  // Processar dados começando da linha 5 (índice 4)
  for (let i = 4; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.trim() === "") continue;

    try {
      const values = line.split(";").map((v) => v.trim());
      const row: any = {};

      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });

      // Validar campos obrigatórios
      if (!row.COD_PEDIDO || row.COD_PEDIDO.trim() === "") {
        errors.push({
          rowNumber: i + 1,
          error: "COD_PEDIDO vazio",
          rawRow: line,
        });
        continue;
      }

      if (!row.COD_PROD || row.COD_PROD.trim() === "") {
        errors.push({
          rowNumber: i + 1,
          error: "COD_PROD vazio",
          rawRow: line,
        });
        continue;
      }

      const parsed: ParsedPedidoVendaProduto = {
        codPedido: row.COD_PEDIDO,
        codProd: row.COD_PROD,
        descSaida: row.DESC_SAIDA || "",
        codPessoa: row.COD_PESSOA || "",
        codUsuario: row.COD_USUARIO || "",
        codEquipe: row.COD_EQUIPE || "",
        dtaEmissao: parseDate(row.DTA_EMISSAO),
        dtaEntrega: parseDate(row.DTA_ENTREGA),
        dtaFaturamento: parseDate(row.DTA_FATURAMENTO),
        unidade: row.UNIDADE || "",
        qtde: parseNumber(row.QTDE),
        valorUnit: parseNumber(row.VALOR_UNIT),
        totalItem: parseNumber(row.TOTAL_ITEM),
        desconto: parseNumber(row.DESCONTO),
        saldo: parseNumber(row.SALDO),
        situacao: row.SITUACAO || "",
        descSit: row.DESC_SIT || "",
        codStatus: row.COD_STATUS || "",
        formaPagto: row.FORMA_PAGTO || "",
        lote: row.LOTE || "",
        codFab: row.COD_FAB || "",
        cidade: row.CIDADE || "",
        item: parseInt(row.ITEM || "0", 10),
        qtdeFaturado: parseNumber(row.QTDE_FATURADO),
        qtdeFaturar: parseNumber(row.QTDE_FATURAR),
        valorTotal: parseNumber(row.VALOR_TOTAL),
        totalFinal: parseNumber(row.TOTAL_FINAL),
        ipi: parseNumber(row.VLR_IPI),
        icmsSubstTrib: parseNumber(row.VLR_ICMS_SUBST_TRIB),
      };

      pedidos.push(parsed);
    } catch (error) {
      errors.push({
        rowNumber: i + 1,
        error: error instanceof Error ? error.message : "Erro desconhecido",
        rawRow: line,
      });
    }
  }

  return { pedidos, errors };
}
