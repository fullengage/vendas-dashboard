import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, date, uniqueIndex, boolean, datetime } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Contas a receber e recebidas.
 * Chave única: cont + parcela + codEmpresa para evitar duplicidade.
 */
export const contasReceber = mysqlTable("contas_receber", {
  id: int("id").autoincrement().primaryKey(),
  cont: varchar("cont", { length: 20 }).notNull(),
  situacao: varchar("situacao", { length: 10 }),
  provisao: varchar("provisao", { length: 20 }),
  numNf: varchar("num_nf", { length: 20 }),
  codPessoa: varchar("cod_pessoa", { length: 20 }),
  parcela: varchar("parcela", { length: 10 }).notNull(),
  numEcfSerieNf: varchar("num_ecf_serie_nf", { length: 20 }),
  dtaTransfBorderaux: varchar("dta_transf_borderaux", { length: 20 }),
  ctrlVariosDocs: varchar("ctrl_varios_docs", { length: 20 }),
  dtaVecto: varchar("dta_vecto", { length: 10 }),
  valor: decimal("valor", { precision: 15, scale: 2 }).default("0"),
  dtaPagto: varchar("dta_pagto", { length: 10 }),
  valorPago: decimal("valor_pago", { precision: 15, scale: 2 }).default("0"),
  tipoDoc: varchar("tipo_doc", { length: 10 }),
  descDesconto: varchar("desc_desconto", { length: 100 }),
  desconto: decimal("desconto", { precision: 15, scale: 2 }).default("0"),
  descValor: varchar("desc_valor", { length: 100 }),
  dtaEmissao: varchar("dta_emissao", { length: 10 }),
  tipoPagto: varchar("tipo_pagto", { length: 10 }),
  obs: text("obs"),
  sitDoc: varchar("sit_doc", { length: 10 }),
  regiao: varchar("regiao", { length: 50 }),
  razaoCli: varchar("razao_cli", { length: 255 }),
  cidade: varchar("cidade", { length: 100 }),
  descricao: varchar("descricao", { length: 100 }),
  razao: varchar("razao", { length: 255 }),
  vendedor: varchar("vendedor", { length: 255 }),
  codEquipe: varchar("cod_equipe", { length: 20 }),
  codEmpresa: varchar("cod_empresa", { length: 10 }).notNull(),
  documento: varchar("documento", { length: 20 }),
  apelidoEmp: varchar("apelido_emp", { length: 50 }),
  atrasoDias: int("atraso_dias"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("uq_cont_parcela_empresa").on(table.cont, table.parcela, table.codEmpresa),
]);

export type ContaReceber = typeof contasReceber.$inferSelect;
export type InsertContaReceber = typeof contasReceber.$inferInsert;

/**
 * Pedidos de Venda
 * Chave única: cod_pedido para evitar duplicidade
 */
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  codPedido: varchar("cod_pedido", { length: 20 }).notNull().unique(),
  codPessoa: varchar("cod_pessoa", { length: 20 }).notNull(), // Cliente
  codUsuario: varchar("cod_usuario", { length: 20 }), // Vendedor
  codEquipe: varchar("cod_equipe", { length: 20 }),
  dtaEmissao: varchar("dta_emissao", { length: 10 }).notNull(), // dd/mm/yyyy
  dtaEntrega: varchar("dta_entrega", { length: 10 }),
  dtaFaturamento: varchar("dta_faturamento", { length: 10 }),
  valorTotal: decimal("valor_total", { precision: 15, scale: 2 }).default("0"),
  desconto: decimal("desconto", { precision: 15, scale: 2 }).default("0"),
  valorFinal: decimal("valor_final", { precision: 15, scale: 2 }).default("0"),
  situacao: varchar("situacao", { length: 50 }), // NORMAL, CANCELADO, etc
  descSit: varchar("desc_sit", { length: 100 }),
  codStatus: varchar("cod_status", { length: 20 }),
  formaPagto: varchar("forma_pagto", { length: 50 }),
  obs: text("obs"),
  statusFaturamento: mysqlEnum("status_faturamento", ["faturado", "nao_faturado", "pendente"]).default("pendente").notNull(),
  importBatchId: int("import_batch_id"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

/**
 * Itens do Pedido
 * Chave única: order_id + cod_prod + lote para evitar duplicidade
 */
export const orderItems = mysqlTable("order_items", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("order_id").notNull(),
  codProd: varchar("cod_prod", { length: 20 }).notNull(),
  descSaida: varchar("desc_saida", { length: 255 }).notNull(),
  unidade: varchar("unidade", { length: 10 }),
  qtde: decimal("qtde", { precision: 12, scale: 2 }).default("0"),
  valorUnit: decimal("valor_unit", { precision: 12, scale: 2 }).default("0"),
  totalItem: decimal("total_item", { precision: 15, scale: 2 }).default("0"),
  desconto: decimal("desconto", { precision: 15, scale: 2 }).default("0"),
  lote: varchar("lote", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("uq_order_prod_lote").on(table.orderId, table.codProd, table.lote),
]);

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

/**
 * Lotes de Importação (para rastrear e evitar duplicidade)
 */
export const importBatches = mysqlTable("import_batches", {
  id: int("id").autoincrement().primaryKey(),
  filename: varchar("filename", { length: 255 }).notNull(),
  fileHash: varchar("file_hash", { length: 64 }).notNull().unique(),
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).default("pending"),
  totalRows: int("total_rows").default(0),
  successRows: int("success_rows").default(0),
  errorRows: int("error_rows").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ImportBatch = typeof importBatches.$inferSelect;
export type InsertImportBatch = typeof importBatches.$inferInsert;

/**
 * Erros de Importação (para auditoria)
 */
export const importErrors = mysqlTable("import_errors", {
  id: int("id").autoincrement().primaryKey(),
  batchId: int("batch_id").notNull(),
  rowNumber: int("row_number").notNull(),
  errorMessage: text("error_message"),
  rawRowJson: text("raw_row_json"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ImportError = typeof importErrors.$inferSelect;
export type InsertImportError = typeof importErrors.$inferInsert;

/**
 * Tabela de leads/clientes para prospecção via WhatsApp
 */
export const leads = mysqlTable("leads", {
  id: int("id").autoincrement().primaryKey(),
  razaoSocial: varchar("razao_social", { length: 255 }).notNull(),
  nomeFantasia: varchar("nome_fantasia", { length: 255 }),
  cnpj: varchar("cnpj", { length: 20 }),
  cpf: varchar("cpf", { length: 20 }),
  email: varchar("email", { length: 255 }),
  telefone: varchar("telefone", { length: 20 }),
  celular: varchar("celular", { length: 20 }),
  endereco: varchar("endereco", { length: 255 }),
  numero: varchar("numero", { length: 20 }),
  complemento: varchar("complemento", { length: 255 }),
  bairro: varchar("bairro", { length: 100 }),
  cidade: varchar("cidade", { length: 100 }),
  estado: varchar("estado", { length: 2 }),
  cep: varchar("cep", { length: 10 }),
  statusContato: mysqlEnum("status_contato", [
    "nao_contatado",
    "contatado",
    "interessado",
    "proposta_enviada",
    "fechado",
    "rejeitado"
  ]).default("nao_contatado").notNull(),
  observacoes: text("observacoes"),
  ativo: int("ativo").default(1).notNull(),
  hasWhatsapp: int("has_whatsapp").default(0).notNull(), // 0 = não validado, 1 = tem WhatsApp, 2 = não tem
  lastWhatsappCheck: timestamp("last_whatsapp_check"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;


/**
 * Histórico de mudanças de equipe dos clientes
 */
export const clientTeamHistory = mysqlTable("client_team_history", {
  id: varchar("id", { length: 36 }).primaryKey(),
  clientId: varchar("client_id", { length: 36 }).notNull(),
  oldTeam: varchar("old_team", { length: 255 }),
  newTeam: varchar("new_team", { length: 255 }),
  changedBy: varchar("changed_by", { length: 36 }),
  changedAt: datetime("changed_at"),
  motivo: text("motivo"),
});

export type ClientTeamHistory = typeof clientTeamHistory.$inferSelect;
export type InsertClientTeamHistory = typeof clientTeamHistory.$inferInsert;

/**
 * Dados de clientes com informações completas
 */
export const clients = mysqlTable("clients", {
  id: varchar("id", { length: 36 }).primaryKey(),
  reportId: varchar("report_id", { length: 36 }),
  userId: varchar("user_id", { length: 36 }),
  clientId: varchar("client_id", { length: 255 }),
  name: varchar("name", { length: 500 }),
  mixDeProdutos: varchar("mix_de_produtos", { length: 255 }),
  valor: decimal("valor", { precision: 15, scale: 2 }),
  rk: int("rk"),
  createdAt: datetime("created_at"),
  companyName: varchar("company_name", { length: 500 }),
  cnpj: varchar("cnpj", { length: 20 }),
  contactName: varchar("contact_name", { length: 500 }),
  phone: varchar("phone", { length: 20 }),
  personType: varchar("person_type", { length: 50 }),
  razaoSocial: varchar("razao_social", { length: 500 }),
  nomeFantasia: varchar("nome_fantasia", { length: 500 }),
  cpf: varchar("cpf", { length: 15 }),
  rg: varchar("rg", { length: 20 }),
  cep: varchar("cep", { length: 10 }),
  endereco: varchar("endereco", { length: 500 }),
  cidade: varchar("cidade", { length: 255 }),
  estado: varchar("estado", { length: 2 }),
  bairro: varchar("bairro", { length: 255 }),
  addressSubRegion: varchar("address_sub_region", { length: 255 }),
  email: varchar("email", { length: 255 }),
  clientType: varchar("client_type", { length: 100 }),
  businessGroup: varchar("business_group", { length: 255 }),
  paymentForm: varchar("payment_form", { length: 100 }),
  priceList: varchar("price_list", { length: 100 }),
  creditLimit: decimal("credit_limit", { precision: 15, scale: 2 }),
  creditDocsQuantity: int("credit_docs_quantity"),
  creditValidity: varchar("credit_validity", { length: 50 }),
  creditStatus: varchar("credit_status", { length: 50 }),
  averageTermDays: int("average_term_days"),
  costCenter: varchar("cost_center", { length: 100 }),
  accountingAccount: varchar("accounting_account", { length: 100 }),
  team: varchar("team", { length: 255 }),
  representatives: text("representatives"),
  observations: text("observations"),
  alerts: text("alerts"),
  taxRegime: varchar("tax_regime", { length: 100 }),
  calculatesIcms: boolean("calculates_icms"),
  saleWithIpi: boolean("sale_with_ipi"),
  ipiInIcmsBase: boolean("ipi_in_icms_base"),
  exemptIcms: boolean("exempt_icms"),
  icmsReductionPercentage: decimal("icms_reduction_percentage", { precision: 5, scale: 2 }),
  icmsStReductionPercentage: decimal("icms_st_reduction_percentage", { precision: 5, scale: 2 }),
  stRatePercentage: decimal("st_rate_percentage", { precision: 5, scale: 2 }),
  taxSubstitution: boolean("tax_substitution"),
  icmsDeferral: boolean("icms_deferral"),
  finalConsumer: boolean("final_consumer"),
  presenceIndicator: varchar("presence_indicator", { length: 50 }),
  suframaInscription: varchar("suframa_inscription", { length: 100 }),
  grantSuframaDiscount: boolean("grant_suframa_discount"),
  stateInscriptions: text("state_inscriptions"),
  legalBasis: varchar("legal_basis", { length: 255 }),
  operationNature: varchar("operation_nature", { length: 255 }),
  serviceTaxation: varchar("service_taxation", { length: 100 }),
  pixKey: varchar("pix_key", { length: 255 }),
  bankNumber: varchar("bank_number", { length: 10 }),
  bankAgency: varchar("bank_agency", { length: 10 }),
  bankAccount: varchar("bank_account", { length: 20 }),
  accountHolder: varchar("account_holder", { length: 255 }),
  addDeliveryFeeToBill: boolean("add_delivery_fee_to_bill"),
  notProtestDeliveryBill: boolean("not_protest_delivery_bill"),
  automaticInvoice: boolean("automatic_invoice"),
  dailyInterestPercentage: decimal("daily_interest_percentage", { precision: 5, scale: 2 }),
  finePercentage: decimal("fine_percentage", { precision: 5, scale: 2 }),
  hideInstallmentOnBill: boolean("hide_installment_on_bill"),
  freightKnowledge: varchar("freight_knowledge", { length: 100 }),
  preferredCarrier: varchar("preferred_carrier", { length: 255 }),
  freightPreselection: varchar("freight_preselection", { length: 100 }),
  nfTransferPath: varchar("nf_transfer_path", { length: 500 }),
  situacaoCadastral: varchar("situacao_cadastral", { length: 100 }),
  capitalSocial: decimal("capital_social", { precision: 15, scale: 2 }),
  inscricaoMunicipal: varchar("inscricao_municipal", { length: 50 }),
  site: varchar("site", { length: 255 }),
  contatos: text("contatos"),
  priceTableId: varchar("price_table_id", { length: 100 }),
  curveClass: varchar("curve_class", { length: 50 }),
  address: varchar("address", { length: 500 }),
  cotacaoMoeda: varchar("cotacao_moeda", { length: 10 }),
  inscricaoEstadual: varchar("inscricao_estadual", { length: 50 }),
  ipiNaBcIcms: boolean("ipi_na_bc_icms"),
  loteProduto: varchar("lote_produto", { length: 100 }),
  naoParticiparControlePremiacao: boolean("nao_participar_controle_premiacao"),
  somarTaxaEntregaBoleto: boolean("somar_taxa_entrega_boleto"),
  tipoCliente: varchar("tipo_cliente", { length: 100 }),
  vencimentoMinimo: int("vencimento_minimo"),
  nomeEquipe: varchar("nome_equipe", { length: 255 }),
  userName: varchar("user_name", { length: 255 }),
  openingDate: date("opening_date"),
  companySize: varchar("company_size", { length: 100 }),
  registrationStatusDate: date("registration_status_date"),
  isActive: boolean("is_active"),
  lastContactDate: date("last_contact_date"),
  potentialLevel: varchar("potential_level", { length: 50 }),
  addressRegion: varchar("address_region", { length: 255 }),
  cnae: varchar("cnae", { length: 20 }),
  cnaePrincipal: varchar("cnae_principal", { length: 255 }),
  dataConsulta: date("data_consulta"),
  dataAbertura: date("data_abertura"),
  potentialLevelInt: int("potential_level_int"),
  potencialCompra: varchar("potencial_compra", { length: 50 }),
  potencialScore: decimal("potencial_score", { precision: 5, scale: 2 }),
  convertedFromLeadId: varchar("converted_from_lead_id", { length: 36 }),
  conversionDate: date("conversion_date"),
  ultimaCompra: date("ultima_compra"),
  valorBackup: decimal("valor_backup", { precision: 15, scale: 2 }),
});

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;
