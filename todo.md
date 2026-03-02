# TODO - Upgrade para Banco de Dados

## Fase 1: Upgrade do projeto
- [x] Executar webdev_add_feature para web-db-user
- [x] Verificar estrutura do projeto após upgrade

## Fase 2: Schema e API
- [x] Criar tabela `contas_receber` com todos os campos do CSV
- [x] Criar constraint UNIQUE para evitar duplicidade (CONT + PARCELA + COD_EMPRESA)
- [x] Criar API POST /api/import para importar CSV (via tRPC importCsv)
- [x] Criar API GET /api/contas para listar dados com filtros
- [x] Criar API GET /api/relatorio-mensal para relatório mensal
- [x] Criar API GET /api/vendedores para stats de vendedores
- [x] Migrar dados de 2025 para o banco (2557 registros)

## Fase 3: Frontend
- [x] Atualizar hooks para consumir APIs via tRPC
- [x] Adicionar filtro por ano no dashboard
- [x] Adicionar página de Relatório Mensal detalhado
- [x] Adicionar funcionalidade de upload de CSV

## Fase 4: Upload sem duplicidade
- [x] Criar página de upload de CSV com prévia dos dados
- [x] Implementar lógica de upsert (ON DUPLICATE KEY UPDATE) no backend
- [x] Feedback visual de quantos registros novos vs duplicados

## Fase 5: Testar e entregar
- [x] Escrever testes vitest (11 testes passando)
- [x] Dashboard carregando dados do banco com sucesso
- [x] Checkpoint e entrega

## Fase 6: Relatório por Região e Estado
- [x] Analisar dados de região e cidade/estado existentes no banco
- [x] Criar mapeamento cidade → estado → região no shared/cidadeEstado.ts
- [x] Criar query SQL getRelatorioPorCidade com filtros de ano e vendedor
- [x] Criar endpoint tRPC relatorioPorCidade
- [x] Criar página RelatorioRegiao.tsx com KPI cards, gráficos e tabela
- [x] Adicionar KPI cards por região clicáveis como filtro
- [x] Adicionar gráfico de barras faturamento por região
- [x] Adicionar gráfico de pizza participação por região
- [x] Adicionar aba Por Estado com gráfico horizontal
- [x] Adicionar aba Top Cidades com gráfico
- [x] Adicionar tabela detalhada por estado com ordenação
- [x] Adicionar botão "Região / Estado" no dashboard principal
- [x] Adicionar rota /relatorio-regiao no App.tsx
- [x] Escrever testes vitest para o novo endpoint (13 testes passando)
- [x] Checkpoint e entrega
