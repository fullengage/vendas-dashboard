import { createConnection } from "mysql2/promise";
import { createHash } from "crypto";
import fs from "fs";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

function parseNumber(str) {
  if (!str || str.trim() === "") return 0;
  return parseFloat(str.replace(/\./g, "").replace(",", "."));
}

function parseDate(str) {
  if (!str || str.trim() === "") return null;
  const parts = str.split("/");
  if (parts.length !== 3) return null;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

function calculateFileHash(content) {
  return createHash("sha256").update(content).digest("hex");
}

function parsePedidosCSV(content) {
  const lines = content.split("\n");
  const pedidos = [];
  const errors = [];

  let headerLineIndex = -1;
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    if (lines[i].includes("COD_PEDIDO")) {
      headerLineIndex = i;
      break;
    }
  }

  if (headerLineIndex === -1) {
    return { pedidos: [], errors: [{ rowNumber: 0, error: "Header not found" }] };
  }

  const headerLine = lines[headerLineIndex];
  const headers = headerLine.split(";");
  const headerMap = new Map();
  headers.forEach((h, i) => {
    headerMap.set(h.trim(), i);
  });

  const pedidoMap = new Map();

  for (let i = headerLineIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    try {
      const fields = line.split(";");
      const row = {};

      headers.forEach((header, idx) => {
        const key = header.trim();
        row[key] = fields[idx] || "";
      });

      const codPedido = row["COD_PEDIDO"]?.trim();
      if (!codPedido) continue;

      if (!pedidoMap.has(codPedido)) {
        pedidoMap.set(codPedido, []);
      }
      pedidoMap.get(codPedido).push(row);
    } catch (err) {
      errors.push({
        rowNumber: i + 1,
        error: `Parse error: ${err.message}`,
      });
    }
  }

  pedidoMap.forEach((rows, codPedido) => {
    try {
      const firstRow = rows[0];

      const itensMap = new Map();
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

      const pedido = {
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
        error: `Consolidation error for ${codPedido}: ${err.message}`,
      });
    }
  });

  return { pedidos, errors };
}

async function importPedidos() {
  const connection = await createConnection(DATABASE_URL);

  const files = [
    "/home/ubuntu/upload/PedidosdeVendaxProdutos-Periodo-01-01-2024a01-12-2024-Situacoesselecionadas-Aberto.csv",
    "/home/ubuntu/upload/PedidosdeVendaxProdutos-Periodo-01-01-2026a04-03-2026-Situacoesselecionadas-Aberto.csv"
  ];

  for (const filePath of files) {
    console.log(`\n📥 Importando ${filePath.split("/").pop()}...`);
    
    const content = fs.readFileSync(filePath, "latin1");
    const fileHash = calculateFileHash(content);
    const { pedidos, errors } = parsePedidosCSV(content);

    console.log(`✓ Parser: ${pedidos.length} pedidos, ${errors.length} erros`);
    
    if (errors.length > 0) {
      console.log("Primeiros 5 erros:");
      errors.slice(0, 5).forEach(e => console.log(`  - Linha ${e.rowNumber}: ${e.error}`));
    }

    // Importar pedidos
    let created = 0;
    let updated = 0;
    let itemsCreated = 0;

    for (const pedido of pedidos) {
      try {
        // Verificar se pedido já existe
        const [existing] = await connection.execute(
          "SELECT id FROM orders WHERE cod_pedido = ?",
          [pedido.codPedido]
        );

        let orderId;
        if (existing.length > 0) {
          orderId = existing[0].id;
          await connection.execute(
            `UPDATE orders SET valor_total = ?, desconto = ?, valor_final = ?, 
             dta_faturamento = ?, cod_status = ? WHERE cod_pedido = ?`,
            [pedido.valorTotal, pedido.desconto, pedido.valorFinal, 
             pedido.dtaFaturamento, pedido.codStatus, pedido.codPedido]
          );
          updated++;
        } else {
          const [result] = await connection.execute(
            `INSERT INTO orders (cod_pedido, cod_pessoa, cod_usuario, cod_equipe, 
             dta_emissao, dta_entrega, dta_faturamento, valor_total, desconto, valor_final,
             situacao, desc_sit, cod_status, forma_pagto)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [pedido.codPedido, pedido.codPessoa, pedido.codUsuario, pedido.codEquipe,
             pedido.dtaEmissao, pedido.dtaEntrega, pedido.dtaFaturamento,
             pedido.valorTotal, pedido.desconto, pedido.valorFinal,
             pedido.situacao, pedido.descSit, pedido.codStatus, pedido.formaPagto]
          );
          orderId = result.insertId;
          created++;
        }

        // Importar itens
        for (const item of pedido.itens) {
          const [existingItem] = await connection.execute(
            "SELECT id FROM order_items WHERE order_id = ? AND cod_prod = ? AND lote = ?",
            [orderId, item.codProd, item.lote]
          );

          if (existingItem.length === 0) {
            await connection.execute(
              `INSERT INTO order_items (order_id, cod_prod, desc_saida, unidade, qtde, valor_unit, total_item, desconto, lote)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [orderId, item.codProd, item.descSaida, item.unidade, item.qtde, 
               item.valorUnit, item.totalItem, item.desconto, item.lote]
            );
            itemsCreated++;
          }
        }
      } catch (err) {
        console.error(`Erro ao importar pedido ${pedido.codPedido}:`, err.message);
      }
    }

    console.log(`✓ Importação concluída: ${created} pedidos criados, ${updated} atualizados, ${itemsCreated} itens criados`);
  }

  await connection.end();
  console.log("\n✅ Importação de Pedidos finalizada!");
}

importPedidos().catch(err => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
