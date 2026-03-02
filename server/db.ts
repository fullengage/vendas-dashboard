import { eq, sql, and, gte, lte, desc, asc, count, sum } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, contasReceber, InsertContaReceber } from "../drizzle/schema";
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

  const result = await db
    .select({
      mes: sql<string>`DATE_FORMAT(${contasReceber.dtaVecto}, '%Y-%m')`,
      totalValor: sql<string>`COALESCE(SUM(${contasReceber.valor}), 0)`,
      totalPago: sql<string>`COALESCE(SUM(${contasReceber.valorPago}), 0)`,
      totalDesconto: sql<string>`COALESCE(SUM(${contasReceber.desconto}), 0)`,
      qtdTitulos: sql<number>`COUNT(*)`,
      qtdClientes: sql<number>`COUNT(DISTINCT ${contasReceber.razaoCli})`,
      mediaAtraso: sql<string>`COALESCE(AVG(${contasReceber.atrasoDias}), 0)`,
      titulosAtrasados: sql<number>`SUM(CASE WHEN ${contasReceber.atrasoDias} > 0 THEN 1 ELSE 0 END)`,
    })
    .from(contasReceber)
    .where(whereClause)
    .groupBy(sql`DATE_FORMAT(${contasReceber.dtaVecto}, '%Y-%m')`)
    .orderBy(sql`DATE_FORMAT(${contasReceber.dtaVecto}, '%Y-%m')`);

  return result;
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
