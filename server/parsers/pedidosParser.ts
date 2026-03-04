import { createHash } from "crypto";

/**
 * Parser para CSV de Pedidos de Venda x Produtos
 * - Encoding: ISO-8859-1
 * - Separador: ;
 * - Header está na linha 3 (índice 3)
 * - Colunas principais: COD_PEDIDO, COD_PESSOA, COD_USUARIO, DTA_EMISSAO, VALOR_PEDIDO_TOTAL, etc.
 */

export interface PedidoRow {
  [key: string]: string;
}

export interface ParsedPedido {
  codPedido: string;
  codPessoa: string;
  codUsuario: string;
  codEquipe: string;
  dtaEmissao: string;
  dtaEntrega: string;
  dtaFaturamento: string;
  valorTotal: number;
  desconto: number;
  valorFinal: number;
  situacao: string;
  descSit: string;
  codStatus: string;
  formaPagto: string;
  itens: ParsedPedidoItem[];
}

export interface ParsedPedidoItem {
  codProd: string;
  descSaida: string;
  unidade: string;
  qtde: number;
  valorUnit: number;
  totalItem: number;
  desconto: number;
  lote: string;
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
export function calculateFileHash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

/**
 * Parser principal do CSV
 */
export function parsePedidosCSV(content: string): {
  pedidos: ParsedPedido[];
  errors: Array<{ rowNumber: number; error: string; rawRow: string }>;
} {
  const lines = content.split("\n");
  const pedidos: ParsedPedido[] = [];
  const errors: Array<{ rowNumber: number; error: string; rawRow: string }> = [];

  // Encontrar a linha do header (procura por "COD_PEDIDO")
  let headerLineIndex = -1;
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    if (lines[i].includes("COD_PEDIDO")) {
      headerLineIndex = i;
      break;
    }
  }

  if (headerLineIndex === -1) {
    return { pedidos: [], errors: [{ rowNumber: 0, error: "Header not found (COD_PEDIDO column missing)", rawRow: "" }] };
  }

  const headerLine = lines[headerLineIndex];
  const headers = headerLine.split(";");
  const headerMap = new Map<string, number>();
  headers.forEach((h, i) => {
    headerMap.set(h.trim(), i);
  });

  // Agrupar linhas por COD_PEDIDO
  const pedidoMap = new Map<string, PedidoRow[]>();

  for (let i = headerLineIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    try {
      const fields = line.split(";");
      const row: PedidoRow = {};

      headers.forEach((header, idx) => {
        const key = header.trim();
        row[key] = fields[idx] || "";
      });

      const codPedido = row["COD_PEDIDO"]?.trim();
      if (!codPedido) {
        errors.push({
          rowNumber: i + 1,
          error: "COD_PEDIDO não encontrado",
          rawRow: line.substring(0, 100),
        });
        continue;
      }

      if (!pedidoMap.has(codPedido)) {
        pedidoMap.set(codPedido, []);
      }
      pedidoMap.get(codPedido)!.push(row);
    } catch (err) {
      errors.push({
        rowNumber: i + 1,
        error: `Parse error: ${err instanceof Error ? err.message : "unknown"}`,
        rawRow: line.substring(0, 100),
      });
    }
  }

  // Consolidar pedidos e itens
  pedidoMap.forEach((rows, codPedido) => {
    try {
      const firstRow = rows[0];

      // Consolidar itens do pedido
      const itensMap = new Map<string, ParsedPedidoItem>();
      let totalPedido = 0;
      let descountoPedido = 0;

      rows.forEach((row) => {
        const codProd = row["COD_PROD"]?.trim();
        const lote = row["LOTE"]?.trim() || "";
        const key = `${codProd}|${lote}`;

        if (!itensMap.has(key)) {
          const qtde = parseNumber(row["QTDE"] || "0");
          const valorUnit = parseNumber(row["VALOR_UNIT"] || "0");
          const totalItem = parseNumber(row["TOTAL_ITEM"] || "0");
          const desconto = parseNumber(row["DESCONTO"] || "0");

          itensMap.set(key, {
            codProd: codProd || "",
            descSaida: row["DESC_SAIDA"]?.trim() || "",
            unidade: row["UNIDADE"]?.trim() || "",
            qtde,
            valorUnit,
            totalItem,
            desconto,
            lote,
          });

          totalPedido += totalItem;
          descountoPedido += desconto;
        }
      });

      const pedido: ParsedPedido = {
        codPedido,
        codPessoa: firstRow["COD_PESSOA"]?.trim() || "",
        codUsuario: firstRow["COD_USUARIO"]?.trim() || "",
        codEquipe: firstRow["COD_EQUIPE"]?.trim() || "",
        dtaEmissao: parseDate(firstRow["DTA_EMISSAO"]?.trim() || ""),
        dtaEntrega: parseDate(firstRow["DTA_ENTREGA"]?.trim() || ""),
        dtaFaturamento: parseDate(firstRow["DTA_FATURAMENTO"]?.trim() || ""),
        valorTotal: parseNumber(firstRow["VALOR_PEDIDO_TOTAL"] || "0"),
        desconto: descountoPedido,
        valorFinal: parseNumber(firstRow["VALOR_PEDIDO_TOTAL"] || "0") - descountoPedido,
        situacao: firstRow["SITUACAO"]?.trim() || "NORMAL",
        descSit: firstRow["DESC_SIT"]?.trim() || "",
        codStatus: firstRow["COD_STATUS"]?.trim() || "",
        formaPagto: firstRow["FORMA_PAGTO"]?.trim() || "",
        itens: Array.from(itensMap.values()),
      };

      pedidos.push(pedido);
    } catch (err) {
      errors.push({
        rowNumber: 0,
        error: `Consolidation error for ${codPedido}: ${err instanceof Error ? err.message : "unknown"}`,
        rawRow: codPedido,
      });
    }
  });

  return { pedidos, errors };
}
