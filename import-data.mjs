#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Parse DATABASE_URL
function parseDatabaseUrl(url) {
  const urlObj = new URL(url);
  return {
    host: urlObj.hostname,
    port: urlObj.port || 3306,
    user: urlObj.username,
    password: urlObj.password,
    database: urlObj.pathname.slice(1),
    ssl: urlObj.searchParams.get('ssl') ? JSON.parse(urlObj.searchParams.get('ssl')) : undefined,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  };
}

const dbConfig = parseDatabaseUrl(process.env.DATABASE_URL);

// Dividir INSERT com múltiplos VALUES em queries individuais
function splitInsertValues(sqlContent) {
  const queries = [];
  
  // Extrair INSERT INTO ... (...) VALUES
  const match = sqlContent.match(/INSERT INTO\s+(\w+)\s*\((.*?)\)\s*VALUES\s*(.*)/is);
  if (!match) return queries;
  
  const tableName = match[1];
  const columns = match[2];
  const valuesStr = match[3];
  
  // Dividir os VALUES por ), (
  // Mas precisamos ser cuidadosos com strings que contêm ), (
  let inString = false;
  let stringChar = null;
  let escaped = false;
  let currentValue = '';
  let valueCount = 0;
  
  for (let i = 0; i < valuesStr.length; i++) {
    const char = valuesStr[i];
    
    // Handle escape sequences
    if (escaped) {
      currentValue += char;
      escaped = false;
      continue;
    }
    
    if (char === '\\' && inString) {
      escaped = true;
      currentValue += char;
      continue;
    }
    
    // Handle string delimiters
    if ((char === '"' || char === "'") && !inString) {
      inString = true;
      stringChar = char;
      currentValue += char;
    } else if (char === stringChar && inString) {
      inString = false;
      stringChar = null;
      currentValue += char;
    } else if (char === ')' && !inString && i + 1 < valuesStr.length && valuesStr[i + 1] === ',') {
      // Fim de um value
      currentValue += char;
      const query = `INSERT INTO ${tableName} (${columns}) VALUES ${currentValue}`;
      queries.push(query);
      valueCount++;
      currentValue = '';
      i++; // Skip the comma
      
      // Skip whitespace after comma
      while (i + 1 < valuesStr.length && /\s/.test(valuesStr[i + 1])) {
        i++;
      }
      
      // Skip opening paren
      if (i + 1 < valuesStr.length && valuesStr[i + 1] === '(') {
        i++;
      }
    } else {
      currentValue += char;
    }
  }
  
  // Adicionar último value se existir
  if (currentValue.trim()) {
    const query = `INSERT INTO ${tableName} (${columns}) VALUES ${currentValue}`;
    queries.push(query);
    valueCount++;
  }
  
  console.log(`  Parser: ${valueCount} valores extraídos`);
  return queries;
}

async function importTable(connection, tableName, sqlPath) {
  console.log(`\n📥 Importando ${tableName}...`);
  
  if (!fs.existsSync(sqlPath)) {
    console.log(`  ⚠️ Arquivo não encontrado: ${sqlPath}`);
    return { success: 0, error: 0 };
  }
  
  let sqlContent = fs.readFileSync(sqlPath, 'utf-8');
  // Remover schema qualificado
  sqlContent = sqlContent.replace(/"public"\."[^"]+"/g, tableName);
  
  const queries = splitInsertValues(sqlContent);
  
  if (queries.length === 0) {
    console.log(`  ⚠️ Nenhuma query extraída`);
    return { success: 0, error: 0 };
  }
  
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < queries.length; i++) {
    try {
      await connection.query(queries[i]);
      successCount++;
      
      if ((i + 1) % 50 === 0) {
        console.log(`  ✓ ${i + 1}/${queries.length} registros (${successCount} sucesso, ${errorCount} erro)`);
      }
    } catch (err) {
      errorCount++;
      if (!err.message.includes('Duplicate entry')) {
        console.error(`  ✗ Registro ${i + 1}: ${err.message.substring(0, 80)}`);
      }
    }
  }
  
  console.log(`✅ ${tableName}: ${successCount} registros importados, ${errorCount} erros`);
  return { success: successCount, error: errorCount };
}

async function importData() {
  let connection;
  try {
    // Conectar ao banco de dados
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado ao banco de dados');

    // Importar client_team_history
    await importTable(connection, 'client_team_history', path.join(__dirname, 'import_client_team_history.sql'));

    // Importar clients
    await importTable(connection, 'clients', path.join(__dirname, 'import_clients.sql'));

    // Validar dados
    console.log('\n📊 Validando dados...');
    const [clientTeamHistoryCount] = await connection.query('SELECT COUNT(*) as count FROM client_team_history');
    const [clientsCount] = await connection.query('SELECT COUNT(*) as count FROM clients');
    
    console.log(`  • client_team_history: ${clientTeamHistoryCount[0].count} registros`);
    console.log(`  • clients: ${clientsCount[0].count} registros`);

    console.log('\n✅ Importação concluída com sucesso!');
  } catch (error) {
    console.error('❌ Erro durante importação:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Executar importação
importData();
