import fs from "fs";
import mysql from "mysql2/promise";

const csvPath = "/home/ubuntu/upload/Contasarecebererecebidas-Periodo-01-01-2025a30-12-2025.csv";
const csvContent = fs.readFileSync(csvPath, { encoding: "latin1" });

const lines = csvContent.split("\n").filter((l) => l.trim().length > 0);

// The actual header is on line 3 (0-indexed)
const headerLine = 3;
const headers = lines[headerLine].split(";").map((h) => h.trim());

console.log(`Headers: ${headers.join(", ")}`);
console.log(`Total data lines: ${lines.length - headerLine - 1}`);

function parseDate(dateStr) {
  if (!dateStr || dateStr.trim() === "") return null;
  const d = dateStr.trim();
  if (d.includes("/")) {
    const parts = d.split("/");
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    }
  }
  return d;
}

function parseNumber(val) {
  if (!val || val.trim() === "") return "0";
  return val.trim().replace(/\./g, "").replace(",", ".");
}

function parseInteger(val) {
  if (!val || val.trim() === "") return null;
  const n = parseInt(val.trim(), 10);
  return isNaN(n) ? null : n;
}

// Build records starting from line after header
const records = [];
for (let i = headerLine + 1; i < lines.length; i++) {
  const values = lines[i].split(";");
  if (values.length < 10) continue;

  const row = {};
  headers.forEach((h, idx) => {
    row[h] = (values[idx] || "").trim();
  });

  if (!row["CONT"] || !row["PARCELA"]) continue;

  // Calculate atraso_dias from DTA_VECTO and DTA_PAGTO if not in CSV
  let atrasoDias = null;
  const dtaVecto = parseDate(row["DTA_VECTO"]);
  const dtaPagto = parseDate(row["DTA_PAGTO"]);
  if (dtaVecto && dtaPagto) {
    const vecto = new Date(dtaVecto);
    const pagto = new Date(dtaPagto);
    atrasoDias = Math.round((pagto - vecto) / (1000 * 60 * 60 * 24));
  } else if (dtaVecto && !dtaPagto) {
    const vecto = new Date(dtaVecto);
    const today = new Date();
    atrasoDias = Math.round((today - vecto) / (1000 * 60 * 60 * 24));
    if (atrasoDias < 0) atrasoDias = 0;
  }

  records.push({
    cont: row["CONT"],
    situacao: row["SITUACAO"] || null,
    provisao: row["PROVISAO"] || null,
    numNf: row["NUM_NFCUP"] || null,
    codPessoa: row["COD_PESSOA"] || null,
    parcela: row["PARCELA"],
    numEcfSerieNf: row["NUM_ECFSERIENF"] || null,
    dtaTransfBorderaux: row["DTA_TRANSF_BORDERAUX"] || null,
    ctrlVariosDocs: row["CTRL_VARIOS_DOCS"] || null,
    dtaVecto,
    valor: parseNumber(row["VALOR"]),
    dtaPagto,
    valorPago: parseNumber(row["VALOR_PAGO"]),
    tipoDoc: row["TIPO_DOC"] || null,
    descDesconto: row["DESC_DESCONTO"] || null,
    desconto: parseNumber(row["DESCONTO"]),
    descValor: row["DESC_VALOR"] || null,
    dtaEmissao: parseDate(row["DTA_EMISSAO"]),
    tipoPagto: row["TIPO_PAGTO"] || null,
    obs: row["OBS"] || null,
    sitDoc: row["SIT_DOC"] || null,
    regiao: row["REGIAO"] || null,
    razaoCli: row["RAZAO_CLI"] || null,
    cidade: row["CIDADE"] || null,
    descricao: row["DESCRICAO"] || null,
    razao: row["RAZAO"] || null,
    vendedor: row["NOME"] || null,
    codEquipe: row["COD_EQUIPE"] || null,
    codEmpresa: row["COD_EMPRESA"] || "1",
    documento: row["DOCUMENTO"] || null,
    apelidoEmp: row["APELIDO_EMP"] || null,
    atrasoDias,
  });
}

console.log(`Parsed ${records.length} valid records`);

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set!");
  process.exit(1);
}

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL);

  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    try {
      await connection.execute(
        `INSERT INTO contas_receber 
          (cont, situacao, provisao, num_nf, cod_pessoa, parcela, num_ecf_serie_nf, 
           dta_transf_borderaux, ctrl_varios_docs, dta_vecto, valor, dta_pagto, valor_pago, 
           tipo_doc, desc_desconto, desconto, desc_valor, dta_emissao, tipo_pagto, obs, 
           sit_doc, regiao, razao_cli, cidade, descricao, razao, vendedor, cod_equipe, 
           cod_empresa, documento, apelido_emp, atraso_dias) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
           situacao = VALUES(situacao), valor = VALUES(valor), valor_pago = VALUES(valor_pago),
           dta_pagto = VALUES(dta_pagto), desconto = VALUES(desconto), vendedor = VALUES(vendedor),
           razao_cli = VALUES(razao_cli), cidade = VALUES(cidade), descricao = VALUES(descricao),
           atraso_dias = VALUES(atraso_dias)`,
        [
          r.cont, r.situacao, r.provisao, r.numNf, r.codPessoa, r.parcela,
          r.numEcfSerieNf, r.dtaTransfBorderaux, r.ctrlVariosDocs, r.dtaVecto,
          r.valor, r.dtaPagto, r.valorPago, r.tipoDoc, r.descDesconto, r.desconto,
          r.descValor, r.dtaEmissao, r.tipoPagto, r.obs, r.sitDoc, r.regiao,
          r.razaoCli, r.cidade, r.descricao, r.razao, r.vendedor, r.codEquipe,
          r.codEmpresa, r.documento, r.apelidoEmp, r.atrasoDias,
        ]
      );
      inserted++;
    } catch (err) {
      console.error(`Error at record ${i} (CONT=${r.cont}, PARCELA=${r.parcela}):`, err.message);
      skipped++;
    }

    if ((i + 1) % 500 === 0) {
      console.log(`Progress: ${i + 1}/${records.length} (inserted: ${inserted}, skipped: ${skipped})`);
    }
  }

  console.log(`\nDone! Total: ${records.length}, Inserted: ${inserted}, Skipped: ${skipped}`);
  await connection.end();
}

main().catch(console.error);
