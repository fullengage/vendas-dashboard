import fs from 'fs';
import { createConnection } from 'mysql2/promise';

async function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  const records = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    // Parse CSV line respeitando aspas
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < lines[i].length; j++) {
      const char = lines[i][j];
      const nextChar = lines[i][j + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          j++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    const record = {};
    headers.forEach((header, idx) => {
      record[header] = values[idx] || null;
    });
    records.push(record);
  }
  
  return records;
}

async function importLeads() {
  const csvPath = '/home/ubuntu/upload/clientes_rows(1).csv';
  
  console.log('📂 Lendo arquivo CSV...');
  const records = await parseCSV(csvPath);

  console.log(`📊 Total de registros no CSV: ${records.length}`);

  // Conectar ao banco de dados
  const connection = await createConnection({
    host: process.env.DATABASE_HOST || 'localhost',
    user: process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME || 'vendas_dashboard',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  console.log('🔗 Conectado ao banco de dados');

  let importados = 0;
  let erros = 0;

  // Importar em lotes de 100 registros
  for (let i = 0; i < records.length; i += 100) {
    const lote = records.slice(i, i + 100);
    
    for (const record of lote) {
      try {
        // Limpar valores vazios
        const razaoSocial = (record.razao_social || '').trim();
        if (!razaoSocial) continue;

        const query = `
          INSERT INTO leads (
            razao_social, nome_fantasia, cnpj, cpf, email, 
            telefone, celular, endereco, numero, complemento,
            bairro, cidade, estado, cep, status_contato, observacoes, ativo
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
          razaoSocial,
          (record.nome_fantasia || '').trim() || null,
          (record.cnpj || '').trim() || null,
          (record.cpf || '').trim() || null,
          (record.email || '').trim() || null,
          (record.telefone || '').trim() || null,
          (record.celular || '').trim() || null,
          (record.endereco || '').trim() || null,
          (record.numero || '').trim() || null,
          (record.complemento || '').trim() || null,
          (record.bairro || '').trim() || null,
          (record.cidade || '').trim() || null,
          (record.estado || '').trim() || null,
          (record.cep || '').trim() || null,
          'nao_contatado',
          (record.observacoes || '').trim() || null,
          1, // ativo
        ];

        await connection.execute(query, values);
        importados++;
      } catch (error) {
        erros++;
        if (erros <= 5) { // Mostrar apenas os primeiros 5 erros
          console.error(`❌ Erro ao importar:`, error.message.substring(0, 100));
        }
      }
    }

    const progress = Math.min(i + 100, records.length);
    console.log(`⏳ Processados ${progress} de ${records.length} registros...`);
  }

  await connection.end();

  console.log(`\n✅ Importação concluída!`);
  console.log(`📈 Importados: ${importados}`);
  console.log(`❌ Erros: ${erros}`);
}

importLeads().catch(console.error);
