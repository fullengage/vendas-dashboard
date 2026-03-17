#!/usr/bin/env python3
import re
import os
import sys
from urllib.parse import urlparse
import mysql.connector
from mysql.connector import Error

# Parse DATABASE_URL
db_url = os.getenv('DATABASE_URL')
if not db_url:
    print("❌ DATABASE_URL não definida")
    sys.exit(1)

parsed = urlparse(db_url)
db_config = {
    'host': parsed.hostname,
    'user': parsed.username,
    'password': parsed.password,
    'database': parsed.path.lstrip('/'),
    'port': parsed.port or 3306,
    'ssl_disabled': False,
    'use_pure': True,
}

# Mapeamento de colunas: nome no SQL -> nome no banco
column_mapping = {
    '"CNAE-Principal"': '"CNAE_Principal"',  # Renomear coluna com hífen
}

def parse_sql_file(filepath):
    """Extrair INSERT statements do arquivo SQL"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remover schema qualificado
    content = content.replace('"public"."clients"', 'clients')
    
    # Aplicar mapeamento de colunas
    for old_col, new_col in column_mapping.items():
        content = content.replace(old_col, new_col)
    
    # Extrair o INSERT statement
    match = re.search(r'INSERT INTO\s+clients\s*\((.*?)\)\s*VALUES\s*(.*)', content, re.DOTALL)
    if not match:
        print("❌ Não foi possível extrair INSERT statement")
        return None, None
    
    columns_str = match.group(1)
    values_str = match.group(2)
    
    # Limpar coluna CNAE-Principal se ainda existir
    columns_str = columns_str.replace('"CNAE-Principal"', '"CNAE_Principal"')
    
    columns = [col.strip().strip('"') for col in columns_str.split(',')]
    
    # Dividir VALUES por ), (
    # Usar regex para encontrar ), ( que não estão dentro de strings
    value_tuples = []
    in_string = False
    string_char = None
    escaped = False
    current_tuple = ''
    
    for i, char in enumerate(values_str):
        if escaped:
            current_tuple += char
            escaped = False
            continue
        
        if char == '\\' and in_string:
            escaped = True
            current_tuple += char
            continue
        
        if (char == '"' or char == "'") and not in_string:
            in_string = True
            string_char = char
            current_tuple += char
        elif char == string_char and in_string:
            in_string = False
            string_char = None
            current_tuple += char
        elif char == ')' and not in_string:
            current_tuple += char
            # Verificar se próximo char é ','
            if i + 1 < len(values_str) and values_str[i + 1] == ',':
                value_tuples.append(current_tuple)
                current_tuple = ''
                # Skip até próximo '('
                j = i + 2
                while j < len(values_str) and values_str[j] != '(':
                    j += 1
                # Continuar do próximo '('
                for k in range(i + 2, j + 1):
                    if k < len(values_str):
                        values_str = values_str[:k] if k == j else values_str
        else:
            current_tuple += char
    
    # Adicionar último tuple
    if current_tuple.strip():
        value_tuples.append(current_tuple)
    
    print(f"📊 Extraído: {len(columns)} colunas, {len(value_tuples)} registros")
    
    return columns, value_tuples

def import_data(filepath):
    """Importar dados para o banco de dados"""
    try:
        # Conectar ao banco
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        print("✅ Conectado ao banco de dados")
        
        # Parsear arquivo SQL
        columns, value_tuples = parse_sql_file(filepath)
        if not columns or not value_tuples:
            print("❌ Erro ao parsear arquivo SQL")
            return
        
        # Importar dados
        print(f"\n📥 Importando {len(value_tuples)} registros...")
        
        success_count = 0
        error_count = 0
        
        for i, values in enumerate(value_tuples):
            try:
                # Construir query
                col_list = ', '.join([f'`{col}`' for col in columns])
                query = f"INSERT INTO clients ({col_list}) VALUES {values}"
                
                cursor.execute(query)
                success_count += 1
                
                if (i + 1) % 100 == 0:
                    print(f"  ✓ {i + 1}/{len(value_tuples)} registros ({success_count} sucesso, {error_count} erro)")
                    conn.commit()
            
            except Error as err:
                error_count += 1
                if 'Duplicate entry' not in str(err):
                    print(f"  ✗ Registro {i + 1}: {str(err)[:80]}")
        
        # Commit final
        conn.commit()
        
        print(f"\n✅ Importação concluída: {success_count} sucesso, {error_count} erro")
        
        # Validar
        cursor.execute("SELECT COUNT(*) FROM clients")
        total = cursor.fetchone()[0]
        print(f"📊 Total de registros na tabela: {total}")
        
        cursor.close()
        conn.close()
    
    except Error as err:
        print(f"❌ Erro: {err}")
        sys.exit(1)

if __name__ == '__main__':
    filepath = '/home/ubuntu/upload/clients_rows(19).sql'
    import_data(filepath)
