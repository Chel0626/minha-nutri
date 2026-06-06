# Formulário de Cadastro de Pacientes - Documentação Técnica

## 📄 Visão Geral

Formulário completo para cadastro de pacientes na plataforma, com 6 campos divididos em seção única com layout responsivo.

## 🏗️ Estrutura do Formulário

### URL
```
GET/POST: /app/pacientes/novo
```

### Campos do Formulário

| # | Campo | Tipo | Obrigatório | Validação | Formatação |
|---|-------|------|-------------|-----------|-----------|
| 1 | Nome Completo | text | ✅ Sim | Não vazio | trim() |
| 2 | Data de Nascimento | date | ✅ Sim | Não futura | ISO (YYYY-MM-DD) |
| 3 | CPF | text | ❌ Não | 11 dígitos + verificadores | 000.000.000-00 |
| 4 | Telefone | tel | ❌ Não | 10-11 dígitos | (XX) XXXXX-XXXX |
| 5 | E-mail | email | ❌ Não | Regex padrão | trim() + lowercase |
| 6 | Endereço Completo | textarea | ❌ Não | Sem validação | trim() |

## 🎨 Layout Visual

```
┌─────────────────────────────────────────┐
│ 👤 Informações Pessoais                 │
├─────────────────────────────────────────┤
│ [Nome Completo *]                       │
│ [Data de Nascimento *]  [CPF]           │
│ [Telefone]              [E-mail]        │
│ [Endereço Completo]                     │
│ (Grid: 1 col mobile, 2 cols desktop)   │
├─────────────────────────────────────────┤
│ [Cancelar] [✓ Salvar Paciente]          │
└─────────────────────────────────────────┘
```

## ✅ Validações Detalhadas

### Nome Completo (Obrigatório)
- Não pode estar vazio após trim
- Aceita qualquer caractere
- Armazenado como-é no banco

### Data de Nascimento (Obrigatório)
- Formato: ISO date (YYYY-MM-DD)
- Não pode ser data futura
- Validação: `new Date() > inputDate` retorna erro

### CPF (Opcional)
- Formatação automática: `XXX.XXX.XXX-XX`
- Aceita apenas dígitos
- Validação:
  - Deve ter exatamente 11 dígitos
  - Não pode ser sequência repetida (11111111111)
  - Dígitos verificadores usando algoritmo oficial
- Armazenado sem formatação no banco
- Campo UNIQUE (sem duplicatas)
- Exemplo: `12345678900` → exibido como `123.456.789-00` → salvo como `12345678900`

### Telefone (Opcional)
- Formatação automática: `(XX) XXXXX-XXXX`
- Aceita apenas dígitos
- Validação:
  - 10 dígitos (fixo): (XX) XXXX-XXXX
  - 11 dígitos (celular): (XX) XXXXX-XXXX
- Armazenado sem formatação no banco
- Campo NOT UNIQUE (pode haver duplicatas)
- Exemplo: `11987654321` → exibido como `(11) 98765-4321` → salvo como `11987654321`

### E-mail (Opcional)
- Validação: regex `^\S+@\S+\.\S+$`
- Armazenado com trim e lowercase
- Campo UNIQUE (sem duplicatas)
- Exemplo: `CAROLINA@EXEMPLO.COM` → armazenado como `carolina@exemplo.com`

### Endereço Completo (Opcional)
- Textarea com múltiplas linhas
- Sem validação de formato
- Armazenado como-é com trim
- Placeholder: "Rua Principal, 123, Apto 45, São Paulo - SP, 01234-567"

## 🔧 Funções de Validação

### `validarCPF(cpf: string): boolean`
```typescript
const validarCPF = (cpf: string): boolean => {
  // 1. Limpar entrada
  // 2. Verificar se tem 11 dígitos
  // 3. Verificar se não é sequência repetida
  // 4. Validar primeiro dígito verificador
  // 5. Validar segundo dígito verificador
  return true/false;
};
```

### `validarEmail(email: string): boolean`
```typescript
const validarEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
```

### `validarTelefone(telefone: string): boolean`
```typescript
const validarTelefone = (telefone: string): boolean => {
  const cleaned = telefone.replace(/\D/g, '');
  return cleaned.length === 10 || cleaned.length === 11;
};
```

## 🎯 Fluxo de Uso

### 1. Usuário Acessa `/pacientes/novo`
- Página carrega com formulário vazio
- Todos os campos opcionais (exceto nome e data)
- Input autofocus em "Nome Completo"

### 2. Usuário Preenche Dados
- Formatação automática em tempo real (CPF, Telefone)
- Validação visual de erros ao blur

### 3. Usuário Clica "Salvar Paciente"
- Validação completa do formulário
- Se erro: mensagem de erro contexto
- Se sucesso: loading spinner

### 4. Dados Salvos no Supabase
- Insert na tabela `pacientes`
- Valores numéricos/especiais são limpos
- Campo `created_at` gerado automaticamente
- Constraints validadas (UNIQUE, NOT NULL)

### 5. Feedback e Redirecionamento
- Alerta de sucesso é exibido
- Formulário é resetado
- Após 2 segundos: redirecionamento para `/`

## 💾 Estrutura do Banco

### SQL Insert
```sql
INSERT INTO pacientes (
  nome_completo,
  data_nascimento,
  cpf,
  telefone,
  email,
  endereco_completo,
  created_at
) VALUES (
  'Carolina Silva',
  '1990-05-15',
  '12345678900',
  '11987654321',
  'carolina@exemplo.com',
  'Rua X, 123, SP',
  now()
);
```

### Constraints
- `id`: PRIMARY KEY, AUTO GENERATE (gen_random_uuid())
- `nome_completo`: NOT NULL
- `data_nascimento`: NOT NULL
- `cpf`: UNIQUE (se preenchido)
- `email`: UNIQUE (se preenchido)
- `created_at`: DEFAULT now()

## 🔐 Segurança

- ✅ Validação client-side + server-side (BD)
- ✅ CPF com constraint UNIQUE
- ✅ Email com constraint UNIQUE
- ✅ Dados limpos antes de salvar (trim, sem formatação)
- ✅ Senhas não são armazenadas (para futuro)
- ⚠️ Sem encriptação de dados (considerar para produção)

## 📱 Responsividade

### Mobile (< 768px)
```
┌─────────────────┐
│ Nome Completo   │
│ Data Nasc.      │
│ CPF             │
│ Telefone        │
│ E-mail          │
│ Endereço        │
└─────────────────┘
```

### Desktop (≥ 768px)
```
┌────────────────────────────────────┐
│ Nome Completo                      │
│ Data Nasc.          │ CPF          │
│ Telefone            │ E-mail       │
│ Endereço                           │
└────────────────────────────────────┘
```

## 🔗 Componentes Reutilizados

- `PageHeader` - Header padronizado
- `Alert` - Alertas de sucesso/erro/info
- `FormInput` - Campos de entrada com validação
- `FormTextarea` - Área de texto

## 📊 Estados da UI

| Estado | Comportamento |
|--------|--------------|
| Vazio | Inputs limpos, botão ativo |
| Preenchimento | Formatação automática |
| Loading | Spinner, inputs desabilitados |
| Sucesso | Alerta verde, redirecionamento |
| Erro | Alerta vermelha, inputs habilitados |

## 📚 Referências

- [ARCHITECTURE_BLUEPRINT.md](../ARCHITECTURE_BLUEPRINT.md) - Schema completo
- [database.types.ts](../types/database.types.ts) - Tipos TypeScript
- [SUPABASE_MIGRATIONS.sql](./SUPABASE_MIGRATIONS.sql) - DDL das tabelas
- [FormComponents.tsx](../components/FormComponents.tsx) - Componentes reutilizáveis
