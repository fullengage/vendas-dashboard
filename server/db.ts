import { eq, sql, and, gte, lte, desc, asc, count, sum } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, contasReceber, InsertContaReceber, importBatches, importErrors, InsertImportBatch, InsertImportError, orders, orderItems, InsertOrder, InsertOrderItem } from "../drizzle/schema";
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
