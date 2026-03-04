# Como Reescrever Pedidos Técnicos Corretamente

## ❌ VERSÃO ORIGINAL (Vaga e Ambígua)
```
"Faça uma conciliação entre contas_receber e orders usando uma chave confiável 
(ex.: numero_nf / numero_pedido / cont + parcela + cod_empresa) para que, 
na página Histórico do Cliente, ao clicar em um título/pedido eu consiga ver 
os produtos (itens de order_items, especialmente desc_saida)."
```

**Problemas:**
- Não deixa claro qual é a chave primária de conciliação
- "ex.:" sugere múltiplas opções sem definir qual usar
- Mistura dados de diferentes tabelas sem estrutura clara
- Não especifica o resultado esperado na UI
- Não define se é para contas_receber OU orders

---

## ✅ VERSÃO REESCRITA (Clara e Estruturada)

### 📋 Objetivo
Criar conciliação entre títulos (contas_receber) e pedidos (orders) para que o usuário visualize os produtos de um pedido a partir da tela de Histórico do Cliente.

### 🔗 Mapeamento de Dados

**Chave de Conciliação Principal:**
- `contas_receber.numNf` = `orders.codPedido` (número da nota fiscal = número do pedido)
- **Validação adicional:** `contas_receber.cont` = `orders.id` (opcional, para casos com múltiplas parcelas)

**Relacionamento:**
```
contas_receber (título)
    ↓ (via numNf = codPedido)
orders (pedido)
    ↓ (via orders.id = order_items.orderId)
order_items (itens do pedido)
    ↓ (campos importantes: cod_prod, desc_saida, qtde, valor_unit)
```

### 🎯 Resultado Esperado na Tela

**1. Tabela de Títulos (Contas a Receber) - Histórico do Cliente**
- Adicionar coluna "Ação" com botão: **"Ver Produtos"**
- Botão visível apenas se `numNf` tiver correspondência em `orders.codPedido`
- Botão desabilitado com tooltip se não houver pedido conciliado

**2. Modal de Produtos (ao clicar em "Ver Produtos")**
- Título: `Produtos do Pedido {numNf}`
- Informações do título: NF, Parcela, Valor, Situação
- Informações do pedido: Data de emissão, Data de faturamento, Status
- Tabela com itens do pedido:
  - Colunas: `cod_prod`, `desc_saida`, `qtde`, `valor_unit`, `total_item`
  - Ordenação: por ordem de aparição no pedido
  - Totalizador: Soma de `total_item`

### 📝 Requisitos Técnicos

**Backend:**
- [ ] Criar função `getItensPorTitulo(numNf: string)` que:
  1. Busca `orders.id` usando `orders.codPedido = numNf`
  2. Retorna `order_items` para esse `orders.id`
  3. Retorna null se não houver correspondência

- [ ] Criar endpoint tRPC `contas.itensPorTitulo` que aceita `numNf`

**Frontend:**
- [ ] Adicionar coluna "Ação" na tabela de títulos
- [ ] Criar componente `TituloItensPedidoModal.tsx`
- [ ] Ao clicar em "Ver Produtos", abrir modal com itens
- [ ] Mostrar loading enquanto carrega dados
- [ ] Mostrar mensagem se não houver pedido conciliado

### 💡 Validação de Sucesso

✅ Usuário acessa página "Histórico do Cliente"
✅ Vê tabela de títulos (contas a receber)
✅ Clica em "Ver Produtos" em um título
✅ Modal abre mostrando itens do pedido com `desc_saida`
✅ Pode fechar modal e voltar à tabela

---

## 🎓 Dicas para Reescrever Pedidos Técnicos

### 1. **Defina o Objetivo Claramente**
```
❌ "Faça uma conciliação entre..."
✅ "Criar conciliação entre títulos e pedidos para visualizar produtos"
```

### 2. **Especifique a Chave de Conciliação Exatamente**
```
❌ "usando uma chave confiável (ex.: numero_nf / numero_pedido)"
✅ "usando contas_receber.numNf = orders.codPedido como chave primária"
```

### 3. **Descreva o Fluxo de Dados**
```
❌ "para que eu consiga ver os produtos"
✅ "Fluxo: Título → Pedido (via numNf) → Itens do Pedido (via order_items)"
```

### 4. **Especifique o Resultado na UI**
```
❌ "ao clicar em um título/pedido"
✅ "Tabela de títulos com coluna 'Ação' contendo botão 'Ver Produtos'"
```

### 5. **Liste Requisitos Separadamente**
```
❌ "para que... eu consiga... usando..."
✅ 
- Backend: [ ] Função getItensPorTitulo()
- Frontend: [ ] Modal com tabela de itens
- Validação: [ ] Testes
```

### 6. **Defina Casos Extremos**
```
❌ Sem menção a casos especiais
✅ "Botão desabilitado se não houver pedido conciliado"
```

---

## 📌 Template para Reescrever Pedidos

Use este template para estruturar melhor:

```markdown
# [Nome da Feature]

## Objetivo
[Descrição clara do que deve ser feito]

## Mapeamento de Dados
[Tabelas envolvidas e como se relacionam]

## Resultado Esperado na Tela
[Descrever UI/UX]

## Requisitos Técnicos
- Backend: [ ] Função/Endpoint
- Frontend: [ ] Componente/Modal
- Testes: [ ] Validações

## Validação de Sucesso
[Checklist do que deve funcionar]
```

---

## 🚀 Seu Pedido Reescrito (Versão Final)

> **Título:** Conciliação de Títulos com Pedidos - Visualizar Produtos
>
> **Objetivo:** Permitir que o usuário visualize os produtos (itens) de um pedido a partir da tela de Histórico do Cliente, clicando em um botão na tabela de títulos (contas a receber).
>
> **Chave de Conciliação:** `contas_receber.numNf` = `orders.codPedido`
>
> **Resultado na Tela:**
> - Tabela de títulos com coluna "Ação" contendo botão "Ver Produtos"
> - Ao clicar, modal exibe tabela com itens do pedido (cod_prod, desc_saida, qtde, valor_unit, total)
> - Modal mostra informações do título e do pedido conciliado
> - Botão desabilitado se não houver pedido correspondente
>
> **Requisitos:**
> - Backend: Função `getItensPorTitulo(numNf)` que retorna `order_items` via conciliação
> - Frontend: Componente modal `TituloItensPedidoModal.tsx` com tabela de itens
> - Testes: Validar conciliação e exibição de produtos
