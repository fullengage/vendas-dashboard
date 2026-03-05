import { eq, sql, and, gte, lte, desc, asc, count, sum, or, isNull, isNotNull, ne, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, contasReceber, InsertContaReceber, importBatches, importErrors, InsertImportBatch, InsertImportError, orders, orderItems, InsertOrder, InsertOrderItem, leads, InsertLead } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ==================== Contas a Receber ====================

export async function upsertContaReceber(conta: InsertContaReceber): Promise<"inserted" | "updated" | "skipped"> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    await db.insert(contasReceber).values(conta).onDuplicateKeyUpdate({
      set: {
        situacao: conta.situacao,
        valor: conta.valor,
        valorPago: conta.valorPago,
        dtaPagto: conta.dtaPagto,
        desconto: conta.desconto,
        vendedor: conta.vendedor,
        razaoCli: conta.razaoCli,
        cidade: conta.cidade,
        descricao: conta.descricao,
        atrasoDias: conta.atrasoDias,
      },
    });
    return "inserted";
  } catch (error) {
    console.error("[Database] Failed to upsert conta:", error);
    return "skipped";
  }
}

export async function bulkUpsertContas(contas: InsertContaReceber[]): Promise<{ inserted: number; skipped: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let inserted = 0;
  let skipped = 0;

  // Process in batches of 100
  const batchSize = 100;
  for (let i = 0; i < contas.length; i += batchSize) {
    const batch = contas.slice(i, i + batchSize);
    try {
      for (const conta of batch) {
        await db.insert(contasReceber).values(conta).onDuplicateKeyUpdate({
          set: {
            situacao: conta.situacao,
            valor: conta.valor,
            valorPago: conta.valorPago,
            dtaPagto: conta.dtaPagto,
            desconto: conta.desconto,
            vendedor: conta.vendedor,
            razaoCli: conta.razaoCli,
            cidade: conta.cidade,
            descricao: conta.descricao,
            atrasoDias: conta.atrasoDias,
          },
        });
        inserted++;
      }
    } catch (error) {
      console.error(`[Database] Batch error at index ${i}:`, error);
      skipped += batch.length;
    }
  }

  return { inserted, skipped };
}

export async function getContas(filters?: {
  vendedor?: string;
  mes?: string;
  cidade?: string;
  ano?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  if (filters?.vendedor) {
    conditions.push(eq(contasReceber.vendedor, filters.vendedor));
  }
  if (filters?.cidade) {
    conditions.push(eq(contasReceber.cidade, filters.cidade));
  }
  if (filters?.mes) {
    // mes format: "2025-01"
    const [year, month] = filters.mes.split("-");
    const startDate = `${year}-${month}-01`;
    const endDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    const endDate = `${year}-${month}-${String(endDay).padStart(2, "0")}`;
    conditions.push(sql`${contasReceber.dtaVecto} >= ${startDate}`);
    conditions.push(sql`${contasReceber.dtaVecto} <= ${endDate}`);
  }
  if (filters?.ano) {
    conditions.push(sql`${contasReceber.dtaVecto} >= ${filters.ano + '-01-01'}`);
    conditions.push(sql`${contasReceber.dtaVecto} <= ${filters.ano + '-12-31'}`);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const result = await db
    .select()
    .from(contasReceber)
    .where(whereClause)
    .orderBy(sql`${contasReceber.dtaVecto} ASC`);

  return result;
}

export async function getVendedores() {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .selectDistinct({ vendedor: contasReceber.vendedor })
    .from(contasReceber)
    .where(sql`${contasReceber.vendedor} IS NOT NULL AND ${contasReceber.vendedor} != ''`)
    .orderBy(asc(contasReceber.vendedor));

  return result.map((r) => r.vendedor).filter(Boolean) as string[];
}

export async function getCidades() {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .selectDistinct({ cidade: contasReceber.cidade })
    .from(contasReceber)
    .where(sql`${contasReceber.cidade} IS NOT NULL AND ${contasReceber.cidade} != ''`)
    .orderBy(asc(contasReceber.cidade));

  return result.map((r) => r.cidade).filter(Boolean) as string[];
}

export async function getAnos() {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .selectDistinct({ ano: sql<string>`YEAR(${contasReceber.dtaVecto})` })
    .from(contasReceber)
    .where(sql`${contasReceber.dtaVecto} IS NOT NULL`)
    .orderBy(sql`YEAR(${contasReceber.dtaVecto}) DESC`);

  return result.map((r) => String(r.ano)).filter(Boolean);
}

export async function getRelatorioMensal(filters?: {
  vendedor?: string;
  ano?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  if (filters?.vendedor) {
    conditions.push(eq(contasReceber.vendedor, filters.vendedor));
  }
  if (filters?.ano) {
    conditions.push(sql`${contasReceber.dtaVecto} >= ${filters.ano + '-01-01'}`);
    conditions.push(sql`${contasReceber.dtaVecto} <= ${filters.ano + '-12-31'}`);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const whereSQL = whereClause ? sql`WHERE ${whereClause}` : sql``;
  const rawResult = await db.execute(
    sql`SELECT SUBSTRING(${contasReceber.dtaVecto}, 1, 7) as mes, COALESCE(SUM(${contasReceber.valor}), 0) as totalValor, COALESCE(SUM(${contasReceber.valorPago}), 0) as totalPago, COALESCE(SUM(${contasReceber.desconto}), 0) as totalDesconto, COUNT(*) as qtdTitulos, COUNT(DISTINCT ${contasReceber.razaoCli}) as qtdClientes, COALESCE(AVG(${contasReceber.atrasoDias}), 0) as mediaAtraso, SUM(CASE WHEN ${contasReceber.atrasoDias} > 0 THEN 1 ELSE 0 END) as titulosAtrasados FROM ${contasReceber} ${whereSQL} GROUP BY mes ORDER BY mes`
  );
  return (rawResult as any)[0] || [];
}

export async function getTotalRegistros() {
  const db = await getDb();
  if (!db) return 0;

  const result = await db.select({ total: count() }).from(contasReceber);
  return result[0]?.total ?? 0;
}

export async function getRelatorioPorCidade(filters?: {
  ano?: string;
  vendedor?: string;
  mes?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  conditions.push(sql`${contasReceber.cidade} IS NOT NULL AND ${contasReceber.cidade} != ''`);

  if (filters?.vendedor) {
    conditions.push(eq(contasReceber.vendedor, filters.vendedor));
  }
  if (filters?.ano) {
    conditions.push(sql`${contasReceber.dtaVecto} >= ${filters.ano + '-01-01'}`);
    conditions.push(sql`${contasReceber.dtaVecto} <= ${filters.ano + '-12-31'}`);
  }
  if (filters?.mes) {
    conditions.push(sql`MONTH(${contasReceber.dtaVecto}) = ${parseInt(filters.mes, 10)}`);
  }

  const whereClause = and(...conditions);

  const result = await db
    .select({
      cidade: contasReceber.cidade,
      totalValor: sql<string>`COALESCE(SUM(${contasReceber.valor}), 0)`,
      totalPago: sql<string>`COALESCE(SUM(${contasReceber.valorPago}), 0)`,
      totalDesconto: sql<string>`COALESCE(SUM(${contasReceber.desconto}), 0)`,
      qtdTitulos: sql<number>`COUNT(*)`,
      qtdClientes: sql<number>`COUNT(DISTINCT ${contasReceber.razaoCli})`,
      qtdVendedores: sql<number>`COUNT(DISTINCT ${contasReceber.vendedor})`,
      mediaAtraso: sql<string>`COALESCE(AVG(${contasReceber.atrasoDias}), 0)`,
      titulosAtrasados: sql<number>`SUM(CASE WHEN ${contasReceber.atrasoDias} > 0 THEN 1 ELSE 0 END)`,
    })
    .from(contasReceber)
    .where(whereClause)
    .groupBy(contasReceber.cidade)
    .orderBy(sql`SUM(${contasReceber.valor}) DESC`);

  return result;
}


// ── Detalhe do Vendedor ──────────────────────────────────────────────
export async function getDetalheVendedor(vendedor: string, ano?: string) {
  const db = await getDb();
  if (!db) return null;

  const conditions = [eq(contasReceber.vendedor, vendedor)];
  if (ano) {
    conditions.push(sql`${contasReceber.dtaVecto} >= ${ano + '-01-01'}`);
    conditions.push(sql`${contasReceber.dtaVecto} <= ${ano + '-12-31'}`);
  }

  // KPIs gerais do vendedor
  const [kpis] = await db
    .select({
      totalValor: sql<string>`COALESCE(SUM(${contasReceber.valor}), 0)`,
      totalPago: sql<string>`COALESCE(SUM(${contasReceber.valorPago}), 0)`,
      totalDesconto: sql<string>`COALESCE(SUM(${contasReceber.desconto}), 0)`,
      qtdTitulos: sql<number>`COUNT(*)`,
      qtdClientes: sql<number>`COUNT(DISTINCT ${contasReceber.razaoCli})`,
      qtdCidades: sql<number>`COUNT(DISTINCT ${contasReceber.cidade})`,
      mediaAtraso: sql<string>`COALESCE(AVG(${contasReceber.atrasoDias}), 0)`,
      titulosAtrasados: sql<number>`SUM(CASE WHEN ${contasReceber.atrasoDias} > 0 THEN 1 ELSE 0 END)`,
    })
    .from(contasReceber)
    .where(and(...conditions));

  // Evolução mensal do vendedor - usar sql.raw para evitar backtick duplo no GROUP BY
  const evolucaoRaw = await db.execute(
    sql`SELECT SUBSTRING(${contasReceber.dtaVecto}, 1, 7) as mes, COALESCE(SUM(${contasReceber.valor}), 0) as totalValor, COALESCE(SUM(${contasReceber.valorPago}), 0) as totalPago, COUNT(*) as qtdTitulos FROM ${contasReceber} WHERE ${and(...conditions)} GROUP BY mes ORDER BY mes`
  );
  const evolucao = (evolucaoRaw as any)[0] || [];

  return { kpis, evolucao };
}

// ── Clientes do Vendedor ─────────────────────────────────────────────
export async function getClientesDoVendedor(vendedor: string, ano?: string) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [
    eq(contasReceber.vendedor, vendedor),
    sql`${contasReceber.razaoCli} IS NOT NULL AND ${contasReceber.razaoCli} != ''`,
  ];
  if (ano) {
    conditions.push(sql`${contasReceber.dtaVecto} >= ${ano + '-01-01'}`);
    conditions.push(sql`${contasReceber.dtaVecto} <= ${ano + '-12-31'}`);
  }

  const result = await db
    .select({
      cliente: contasReceber.razaoCli,
      cidade: contasReceber.cidade,
      totalValor: sql<string>`COALESCE(SUM(${contasReceber.valor}), 0)`,
      totalPago: sql<string>`COALESCE(SUM(${contasReceber.valorPago}), 0)`,
      qtdTitulos: sql<number>`COUNT(*)`,
      ultimaCompra: sql<string>`MAX(${contasReceber.dtaVecto})`,
      primeiraCompra: sql<string>`MIN(${contasReceber.dtaVecto})`,
      mesesComCompra: sql<number>`COUNT(DISTINCT SUBSTRING(${contasReceber.dtaVecto}, 1, 7))`,
      ticketMedio: sql<string>`COALESCE(AVG(${contasReceber.valor}), 0)`,
      mediaAtraso: sql<string>`COALESCE(AVG(${contasReceber.atrasoDias}), 0)`,
      titulosAtrasados: sql<number>`SUM(CASE WHEN ${contasReceber.atrasoDias} > 0 THEN 1 ELSE 0 END)`,
    })
    .from(contasReceber)
    .where(and(...conditions))
    .groupBy(contasReceber.razaoCli, contasReceber.cidade)
    .orderBy(sql`SUM(${contasReceber.valor}) DESC`);

  return result;
}

// ── Histórico do Cliente ─────────────────────────────────────────────
export async function getHistoricoCliente(cliente: string, vendedor?: string) {
  const db = await getDb();
  if (!db) return { resumo: null, titulos: [], evolucaoMensal: [] };

  const conditions = [eq(contasReceber.razaoCli, cliente)];
  if (vendedor) {
    conditions.push(eq(contasReceber.vendedor, vendedor));
  }

  // Resumo geral do cliente
  const [resumo] = await db
    .select({
      totalValor: sql<string>`COALESCE(SUM(${contasReceber.valor}), 0)`,
      totalPago: sql<string>`COALESCE(SUM(${contasReceber.valorPago}), 0)`,
      qtdTitulos: sql<number>`COUNT(*)`,
      ultimaCompra: sql<string>`MAX(${contasReceber.dtaVecto})`,
      primeiraCompra: sql<string>`MIN(${contasReceber.dtaVecto})`,
      mesesComCompra: sql<number>`COUNT(DISTINCT SUBSTRING(${contasReceber.dtaVecto}, 1, 7))`,
      ticketMedio: sql<string>`COALESCE(AVG(${contasReceber.valor}), 0)`,
      mediaAtraso: sql<string>`COALESCE(AVG(${contasReceber.atrasoDias}), 0)`,
      titulosAtrasados: sql<number>`SUM(CASE WHEN ${contasReceber.atrasoDias} > 0 THEN 1 ELSE 0 END)`,
      cidade: contasReceber.cidade,
      vendedor: contasReceber.vendedor,
    })
    .from(contasReceber)
    .where(and(...conditions))
    .groupBy(contasReceber.cidade, contasReceber.vendedor);

  // Todos os títulos do cliente (histórico completo)
  const titulos = await db
    .select({
      id: contasReceber.id,
      cont: contasReceber.cont,
      parcela: contasReceber.parcela,
      numNf: contasReceber.numNf,
      situacao: contasReceber.situacao,
      dtaVecto: contasReceber.dtaVecto,
      valor: contasReceber.valor,
      dtaPagto: contasReceber.dtaPagto,
      valorPago: contasReceber.valorPago,
      desconto: contasReceber.desconto,
      descricao: contasReceber.descricao,
      atrasoDias: contasReceber.atrasoDias,
      vendedor: contasReceber.vendedor,
    })
    .from(contasReceber)
    .where(and(...conditions))
    .orderBy(sql`${contasReceber.dtaVecto} DESC`);

  // Evolução mensal do cliente
  const evolucaoRaw = await db.execute(
    sql`SELECT SUBSTRING(${contasReceber.dtaVecto}, 1, 7) as mes, COALESCE(SUM(${contasReceber.valor}), 0) as totalValor, COALESCE(SUM(${contasReceber.valorPago}), 0) as totalPago, COUNT(*) as qtdTitulos FROM ${contasReceber} WHERE ${and(...conditions)} GROUP BY mes ORDER BY mes`
  );
  const evolucaoMensal = (evolucaoRaw as any)[0] || [];

  return { resumo, titulos, evolucaoMensal };
}

// Clientes inativos (6+ meses sem comprar)
export async function getClientesInativos(mesesInatividade: number = 6) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const dataLimite = new Date();
  dataLimite.setMonth(dataLimite.getMonth() - mesesInatividade);
  const dataLimiteStr = dataLimite.toISOString().split('T')[0];

  // Subquery para pegar vendedor e cidade da última compra
  const result = await db.execute(
    sql`
      SELECT 
        c.cliente,
        c.vendedor,
        c.cidade,
        c.ultimaCompra,
        c.totalValor,
        c.totalPago,
        c.qtdTitulos,
        DATEDIFF(CURDATE(), c.ultimaCompra) as diasSemComprar
      FROM (
        SELECT 
          ${contasReceber.razaoCli} as cliente,
          SUBSTRING_INDEX(GROUP_CONCAT(${contasReceber.vendedor} ORDER BY ${contasReceber.dtaEmissao} DESC), ',', 1) as vendedor,
          SUBSTRING_INDEX(GROUP_CONCAT(${contasReceber.cidade} ORDER BY ${contasReceber.dtaEmissao} DESC), ',', 1) as cidade,
          MAX(${contasReceber.dtaEmissao}) as ultimaCompra,
          COALESCE(SUM(${contasReceber.valor}), 0) as totalValor,
          COALESCE(SUM(${contasReceber.valorPago}), 0) as totalPago,
          COUNT(*) as qtdTitulos
        FROM ${contasReceber}
        WHERE ${contasReceber.razaoCli} IS NOT NULL 
          AND ${contasReceber.dtaEmissao} IS NOT NULL
        GROUP BY ${contasReceber.razaoCli}
        HAVING MAX(${contasReceber.dtaEmissao}) < ${dataLimiteStr}
      ) c
      ORDER BY diasSemComprar DESC
    `
  );

  return (result as any)[0] || [];
}


// ============================================================================
// PEDIDOS DE VENDA
// ============================================================================



/**
 * Importar pedidos com idempotência (upsert)
 */
export async function importPedidos(
  parsedPedidos: Array<{
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
    itens: Array<{
      codProd: string;
      descSaida: string;
      unidade: string;
      qtde: number;
      valorUnit: number;
      totalItem: number;
      desconto: number;
      lote: string;
    }>;
  }>,
  batchId: number
): Promise<{ created: number; updated: number; errors: string[] }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const pedido of parsedPedidos) {
    try {
      // Verificar se o pedido já existe
      const existing = await db
        .select()
        .from(orders)
        .where(eq(orders.codPedido, pedido.codPedido))
        .limit(1);

      const orderData: InsertOrder = {
        codPedido: pedido.codPedido,
        codPessoa: pedido.codPessoa,
        codUsuario: pedido.codUsuario,
        codEquipe: pedido.codEquipe,
        dtaEmissao: pedido.dtaEmissao,
        dtaEntrega: pedido.dtaEntrega,
        dtaFaturamento: pedido.dtaFaturamento,
        valorTotal: pedido.valorTotal.toString(),
        desconto: pedido.desconto.toString(),
        valorFinal: pedido.valorFinal.toString(),
        situacao: pedido.situacao,
        descSit: pedido.descSit,
        codStatus: pedido.codStatus,
        formaPagto: pedido.formaPagto,
        importBatchId: batchId,
      };

      let orderId: number;

      if (existing.length > 0) {
        // Atualizar pedido existente
        await db
          .update(orders)
          .set(orderData)
          .where(eq(orders.codPedido, pedido.codPedido));
        orderId = existing[0].id;
        updated++;
      } else {
        // Inserir novo pedido
        const result = await db.insert(orders).values(orderData);
        orderId = (result as any).insertId as unknown as number;
        created++;
      }

      // Importar itens do pedido
      for (const item of pedido.itens) {
        const itemData: InsertOrderItem = {
          orderId,
          codProd: item.codProd,
          descSaida: item.descSaida,
          unidade: item.unidade,
          qtde: item.qtde.toString(),
          valorUnit: item.valorUnit.toString(),
          totalItem: item.totalItem.toString(),
          desconto: item.desconto.toString(),
          lote: item.lote,
        };

        try {
          // Tentar inserir item (pode falhar se já existe)
          await db.insert(orderItems).values(itemData);
        } catch (err) {
          // Item já existe, ignorar (idempotência)
        }
      }
    } catch (err) {
      errors.push(`Erro ao importar pedido ${pedido.codPedido}: ${err instanceof Error ? err.message : "unknown"}`);
    }
  }

  return { created, updated, errors };
}

/**
 * Criar lote de importação
 */
export async function createImportBatch(
  filename: string,
  fileHash: string,
  totalRows: number
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Usar raw SQL para evitar problema com id = default
  const result = await db.execute(
    sql`INSERT INTO import_batches (filename, file_hash, status, total_rows, success_rows, error_rows) VALUES (${filename}, ${fileHash}, 'processing', ${totalRows}, 0, 0)`
  );
  return (result as any)[0].insertId as unknown as number;
}

/**
 * Atualizar status do lote de importação
 */
export async function updateImportBatch(
  batchId: number,
  successRows: number,
  errorRows: number,
  status: "completed" | "failed"
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(importBatches)
    .set({
      successRows,
      errorRows,
      status,
    })
    .where(eq(importBatches.id, batchId));
}

/**
 * Registrar erro de importação
 */
export async function logImportError(
  batchId: number,
  rowNumber: number,
  errorMessage: string,
  rawRowJson: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const error: InsertImportError = {
    batchId,
    rowNumber,
    errorMessage,
    rawRowJson,
  };

  await db.insert(importErrors).values(error);
}

/**
 * Listar pedidos por cliente
 */
export async function getPedidosPorCliente(codPessoa: string): Promise<any[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(orders)
    .where(eq(orders.codPessoa, codPessoa))
    .orderBy(desc(orders.dtaEmissao));
}

/**
 * Listar itens de um pedido
 */
export async function getItensPedido(orderId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));
}

/**
 * Listar pedidos por vendedor
 */
export async function getPedidosPorVendedor(codUsuario: string): Promise<any[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(orders)
    .where(eq(orders.codUsuario, codUsuario))
    .orderBy(desc(orders.dtaEmissao));
}


/**
 * Obter histórico completo de pedidos do cliente (faturados e não faturados)
 * Inclui status e informações de vendedor
 */
export async function getHistoricoPedidosCliente(codPessoa: string): Promise<any[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select({
      id: orders.id,
      codPedido: orders.codPedido,
      dtaEmissao: orders.dtaEmissao,
      dtaFaturamento: orders.dtaFaturamento,
      valorTotal: orders.valorTotal,
      valorFinal: orders.valorFinal,
      situacao: orders.situacao,
      descSit: orders.descSit,
      codStatus: orders.codStatus,
      codUsuario: orders.codUsuario,
      isFaturado: sql<boolean>`CASE WHEN ${orders.dtaFaturamento} IS NOT NULL AND ${orders.dtaFaturamento} != '' THEN 1 ELSE 0 END`,
    })
    .from(orders)
    .where(eq(orders.codPessoa, codPessoa))
    .orderBy(desc(orders.dtaEmissao));
}

/**
 * Obter produtos já comprados por um cliente com agregações
 * Mostra quantidade total, número de pedidos e última data de compra
 */
export async function getProdutosCompradosCliente(codPessoa: string): Promise<any[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select({
      codProd: orderItems.codProd,
      descSaida: orderItems.descSaida,
      qtdTotal: sql<string>`SUM(CAST(${orderItems.qtde} AS DECIMAL(12,2)))`,
      nroPedidos: sql<number>`COUNT(DISTINCT ${orderItems.orderId})`,
      ultimaCompra: sql<string>`MAX(${orders.dtaEmissao})`,
      ultimaCompraFaturada: sql<string>`MAX(CASE WHEN ${orders.dtaFaturamento} IS NOT NULL AND ${orders.dtaFaturamento} != '' THEN ${orders.dtaEmissao} ELSE NULL END)`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(eq(orders.codPessoa, codPessoa))
    .groupBy(orderItems.codProd, orderItems.descSaida)
    .orderBy(desc(sql`MAX(${orders.dtaEmissao})`));
}

/**
 * Obter último pedido do cliente com itens
 */
export async function getUltimoPedidoCliente(codPessoa: string): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const ultimoPedido = await db
    .select({
      id: orders.id,
      codPedido: orders.codPedido,
      dtaEmissao: orders.dtaEmissao,
      dtaFaturamento: orders.dtaFaturamento,
      valorTotal: orders.valorTotal,
      valorFinal: orders.valorFinal,
      situacao: orders.situacao,
      descSit: orders.descSit,
      codUsuario: orders.codUsuario,
      isFaturado: sql<boolean>`CASE WHEN ${orders.dtaFaturamento} IS NOT NULL AND ${orders.dtaFaturamento} != '' THEN 1 ELSE 0 END`,
    })
    .from(orders)
    .where(eq(orders.codPessoa, codPessoa))
    .orderBy(desc(orders.dtaEmissao))
    .limit(1);

  if (!ultimoPedido || ultimoPedido.length === 0) return null;

  const pedido = ultimoPedido[0];
  const itens = await db
    .select({
      codProd: orderItems.codProd,
      descSaida: orderItems.descSaida,
      qtde: orderItems.qtde,
      valorUnit: orderItems.valorUnit,
      totalItem: orderItems.totalItem,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, pedido.id));

  return { ...pedido, itens };
}

/**
 * Obter dias sem comprar (baseado em última compra faturada)
 * Retorna dias decorridos e data da última compra faturada
 */
export async function getDiasSemComprarCliente(codPessoa: string): Promise<{
  diasSemComprar: number | null;
  ultimaCompraFaturada: string | null;
  temComprasFaturadas: boolean;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select({
      ultimaCompraFaturada: sql<string>`MAX(CASE WHEN ${orders.dtaFaturamento} IS NOT NULL AND ${orders.dtaFaturamento} != '' THEN ${orders.dtaEmissao} ELSE NULL END)`,
    })
    .from(orders)
    .where(eq(orders.codPessoa, codPessoa));

  if (!result || result.length === 0) {
    return { diasSemComprar: null, ultimaCompraFaturada: null, temComprasFaturadas: false };
  }

  const ultimaCompraFaturada = result[0].ultimaCompraFaturada;
  if (!ultimaCompraFaturada) {
    return { diasSemComprar: null, ultimaCompraFaturada: null, temComprasFaturadas: false };
  }

  const dataUltima = new Date(ultimaCompraFaturada + "T00:00:00");
  const hoje = new Date();
  const diasSemComprar = Math.floor((hoje.getTime() - dataUltima.getTime()) / (1000 * 60 * 60 * 24));

  return {
    diasSemComprar: diasSemComprar >= 0 ? diasSemComprar : 0,
    ultimaCompraFaturada,
    temComprasFaturadas: true,
  };
}


/**
 * Listar todos os pedidos com filtros opcionais
 * Pode filtrar por cliente, período, status e vendedor
 */
export async function listaPedidosComFiltros(filtros?: {
  codPessoa?: string;
  codUsuario?: string;
  dataInicio?: string;
  dataFim?: string;
  isFaturado?: boolean;
  limite?: number;
  offset?: number;
}): Promise<any[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let query = db
    .select({
      id: orders.id,
      codPedido: orders.codPedido,
      codPessoa: orders.codPessoa,
      dtaEmissao: orders.dtaEmissao,
      dtaFaturamento: orders.dtaFaturamento,
      valorTotal: orders.valorTotal,
      valorFinal: orders.valorFinal,
      situacao: orders.situacao,
      descSit: orders.descSit,
      codStatus: orders.codStatus,
      codUsuario: orders.codUsuario,
      isFaturado: sql<boolean>`CASE WHEN ${orders.dtaFaturamento} IS NOT NULL AND ${orders.dtaFaturamento} != '' THEN 1 ELSE 0 END`,
    })
    .from(orders);

  // Aplicar filtros
  const conditions = [];

  if (filtros?.codPessoa) {
    conditions.push(eq(orders.codPessoa, filtros.codPessoa));
  }

  if (filtros?.codUsuario) {
    conditions.push(eq(orders.codUsuario, filtros.codUsuario));
  }

  if (filtros?.dataInicio) {
    conditions.push(gte(orders.dtaEmissao, filtros.dataInicio));
  }

  if (filtros?.dataFim) {
    conditions.push(lte(orders.dtaEmissao, filtros.dataFim));
  }

  if (filtros?.isFaturado !== undefined) {
    if (filtros.isFaturado) {
      conditions.push(and(
        isNotNull(orders.dtaFaturamento),
        ne(orders.dtaFaturamento, "")
      ));
    } else {
      conditions.push(or(
        isNull(orders.dtaFaturamento),
        eq(orders.dtaFaturamento, "")
      ));
    }
  }

  if (conditions.length > 0) {
    query = (query as any).where(and(...conditions));
  }

  query = (query as any).orderBy(desc(orders.dtaEmissao));

  if (filtros?.limite) {
    query = (query as any).limit(filtros.limite);
  }

  if (filtros?.offset) {
    query = (query as any).offset(filtros.offset);
  }

  return await (query as any);
}

/**
 * Contar total de pedidos com filtros
 */
export async function contaPedidosComFiltros(filtros?: {
  codPessoa?: string;
  codUsuario?: string;
  dataInicio?: string;
  dataFim?: string;
  isFaturado?: boolean;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let query = db
    .select({ count: sql<number>`COUNT(*)` })
    .from(orders);

  const conditions = [];

  if (filtros?.codPessoa) {
    conditions.push(eq(orders.codPessoa, filtros.codPessoa));
  }

  if (filtros?.codUsuario) {
    conditions.push(eq(orders.codUsuario, filtros.codUsuario));
  }

  if (filtros?.dataInicio) {
    conditions.push(gte(orders.dtaEmissao, filtros.dataInicio));
  }

  if (filtros?.dataFim) {
    conditions.push(lte(orders.dtaEmissao, filtros.dataFim));
  }

  if (filtros?.isFaturado !== undefined) {
    if (filtros.isFaturado) {
      conditions.push(and(
        isNotNull(orders.dtaFaturamento),
        ne(orders.dtaFaturamento, "")
      ));
    } else {
      conditions.push(or(
        isNull(orders.dtaFaturamento),
        eq(orders.dtaFaturamento, "")
      ));
    }
  }

  if (conditions.length > 0) {
    query = (query as any).where(and(...conditions));
  }

  const result = await (query as any);
  return result[0]?.count || 0;
}

/**
 * Buscar pedidos por número de pedido (codPedido)
 */
export async function buscaPedidosPorNumero(codPedido: string): Promise<any[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select({
      id: orders.id,
      codPedido: orders.codPedido,
      codPessoa: orders.codPessoa,
      dtaEmissao: orders.dtaEmissao,
      dtaFaturamento: orders.dtaFaturamento,
      valorTotal: orders.valorTotal,
      valorFinal: orders.valorFinal,
      situacao: orders.situacao,
      descSit: orders.descSit,
      codStatus: orders.codStatus,
      codUsuario: orders.codUsuario,
      isFaturado: sql<boolean>`CASE WHEN ${orders.dtaFaturamento} IS NOT NULL AND ${orders.dtaFaturamento} != '' THEN 1 ELSE 0 END`,
    })
    .from(orders)
    .where(like(orders.codPedido, `%${codPedido}%`))
    .orderBy(desc(orders.dtaEmissao));
}


// ============================================================================
// LEADS - PROSPECÇÃO
// ============================================================================

/**
 * Importar leads do CSV
 */
export async function importLeads(leadsData: InsertLead[]): Promise<{ created: number; updated: number; errors: string[] }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const lead of leadsData) {
    try {
      // Verificar se o lead já existe (por CNPJ ou CPF)
      const existing = await db
        .select()
        .from(leads)
        .where(
      or(
        lead.cnpj ? eq(leads.cnpj, lead.cnpj) : eq(leads.razaoSocial, lead.razaoSocial),
        lead.cpf ? eq(leads.cpf, lead.cpf) : eq(leads.razaoSocial, lead.razaoSocial)
      )
        )
        .limit(1);

      if (existing.length > 0) {
        // Atualizar lead existente
        await db
          .update(leads)
          .set({
            ...lead,
            updatedAt: new Date(),
          })
          .where(eq(leads.id, existing[0].id));
        updated++;
      } else {
        // Inserir novo lead
        await db.insert(leads).values(lead);
        created++;
      }
    } catch (err) {
      errors.push(`Erro ao importar lead ${lead.razaoSocial}: ${err instanceof Error ? err.message : "unknown"}`);
    }
  }

  return { created, updated, errors };
}

/**
 * Listar leads com filtros
 */
export async function listaLeadsComFiltros(
  filtros: {
    statusContato?: string;
    cidade?: string;
    estado?: string;
    busca?: string;
    limite?: number;
    offset?: number;
  }
): Promise<any[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conditions: any[] = [];

  if (filtros.statusContato && filtros.statusContato !== "todos") {
    conditions.push(eq(leads.statusContato, filtros.statusContato as any));
  }

  if (filtros.cidade) {
    conditions.push(like(leads.cidade, `%${filtros.cidade}%`));
  }

  if (filtros.estado) {
    conditions.push(eq(leads.estado, filtros.estado));
  }

  if (filtros.busca) {
    conditions.push(
      or(
        like(leads.razaoSocial, `%${filtros.busca}%`),
        like(leads.nomeFantasia, `%${filtros.busca}%`),
        like(leads.cnpj, `%${filtros.busca}%`),
        like(leads.cpf, `%${filtros.busca}%`)
      )
    );
  }

  let query: any = db.select().from(leads);

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  query = query.orderBy(desc(leads.createdAt));

  if (filtros.limite) {
    query = query.limit(filtros.limite);
  }

  if (filtros.offset) {
    query = query.offset(filtros.offset);
  }

  return await query;
}

/**
 * Contar leads com filtros
 */
export async function contaLeadsComFiltros(filtros: {
  statusContato?: string;
  cidade?: string;
  estado?: string;
  busca?: string;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conditions: any[] = [];

  if (filtros.statusContato && filtros.statusContato !== "todos") {
    conditions.push(eq(leads.statusContato, filtros.statusContato as any));
  }

  if (filtros.cidade) {
    conditions.push(like(leads.cidade, `%${filtros.cidade}%`));
  }

  if (filtros.estado) {
    conditions.push(eq(leads.estado, filtros.estado));
  }

  if (filtros.busca) {
    conditions.push(
      or(
        like(leads.razaoSocial, `%${filtros.busca}%`),
        like(leads.nomeFantasia, `%${filtros.busca}%`),
        like(leads.cnpj, `%${filtros.busca}%`),
        like(leads.cpf, `%${filtros.busca}%`)
      )
    );
  }

  let query: any = db.select({ count: count() }).from(leads);

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const result = await query;
  return (result[0] as any)?.count || 0;
}

/**
 * Atualizar status de contato de um lead
 */
export async function atualizarStatusLead(
  leadId: number,
  statusContato: string,
  observacoes?: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: any = {
    statusContato,
    updatedAt: new Date(),
  };

  if (observacoes) {
    updateData.observacoes = observacoes;
  }

  await db.update(leads).set(updateData).where(eq(leads.id, leadId));
}

/**
 * Obter um lead por ID
 */
export async function obterLead(leadId: number): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
  return result[0] || null;
}


/**
 * Validar formato de número de telefone para WhatsApp
 * Aceita números brasileiros com ou sem formatação
 */
export function validarNumeroWhatsApp(telefone: string | null | undefined): boolean {
  if (!telefone) return false;
  
  // Remove tudo que não é dígito
  const apenasDigitos = telefone.replace(/\D/g, "");
  
  // Números brasileiros devem ter 11 dígitos (2 DDD + 9 dígitos do número)
  // Ou 10 dígitos (2 DDD + 8 dígitos do número)
  if (apenasDigitos.length === 11 || apenasDigitos.length === 10) {
    // Verifica se começa com 1-9 (DDD válido)
    const ddd = parseInt(apenasDigitos.substring(0, 2));
    if (ddd >= 11 && ddd <= 99) {
      return true;
    }
  }
  
  return false;
}

/**
 * Validar WhatsApp de um lead específico
 */
export async function validarWhatsAppLead(leadId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const lead = await obterLead(leadId);
  if (!lead) throw new Error("Lead not found");
  
  // Tenta validar celular primeiro, depois telefone
  const temWhatsApp = validarNumeroWhatsApp(lead.celular) || validarNumeroWhatsApp(lead.telefone);
  
  // Atualiza o campo has_whatsapp (1 = tem, 2 = não tem)
  const hasWhatsappValue = temWhatsApp ? 1 : 2;
  
  await db.update(leads)
    .set({
      hasWhatsapp: hasWhatsappValue,
      lastWhatsappCheck: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(leads.id, leadId));
  
  return temWhatsApp;
}

/**
 * Validar WhatsApp de todos os leads
 */
export async function validarWhatsAppTodos(): Promise<{ validados: number; comWhatsApp: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const todosLeads = await db.select().from(leads);
  
  let comWhatsApp = 0;
  
  for (const lead of todosLeads) {
    const temWhatsApp = validarNumeroWhatsApp(lead.celular) || validarNumeroWhatsApp(lead.telefone);
    const hasWhatsappValue = temWhatsApp ? 1 : 2;
    
    if (temWhatsApp) comWhatsApp++;
    
    await db.update(leads)
      .set({
        hasWhatsapp: hasWhatsappValue,
        lastWhatsappCheck: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(leads.id, lead.id));
  }
  
  return {
    validados: todosLeads.length,
    comWhatsApp,
  };
}

/**
 * Obter estatísticas de WhatsApp
 */
export async function obterEstatisticasWhatsApp(): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const total = await db.select({ count: count() }).from(leads);
  const comWhatsApp = await db.select({ count: count() }).from(leads).where(eq(leads.hasWhatsapp, 1));
  const semWhatsApp = await db.select({ count: count() }).from(leads).where(eq(leads.hasWhatsapp, 2));
  const naoValidados = await db.select({ count: count() }).from(leads).where(eq(leads.hasWhatsapp, 0));
  
  return {
    total: (total[0] as any)?.count || 0,
    comWhatsApp: (comWhatsApp[0] as any)?.count || 0,
    semWhatsApp: (semWhatsApp[0] as any)?.count || 0,
    naoValidados: (naoValidados[0] as any)?.count || 0,
  };
}
