# Atualização - Campos Telefone e E-mail (05/06/2026)

## 📋 Resumo das Alterações

A tabela `pacientes` foi expandida com dois novos campos de contato conforme especificado no `ARCHITECTURE_BLUEPRINT.md`.

## 🔄 Mudanças Implementadas

### 1. Schema do Banco de Dados
Adicionados à tabela `pacientes`:
- `telefone` (varchar(20)) - Campo de contato via telefone
- `email` (text, UNIQUE) - Campo de contato via e-mail

### 2. Tipos TypeScript
Arquivo [types/database.types.ts](../types/database.types.ts):
```typescript
export interface Paciente {
  // ... campos existentes
  telefone?: string;      // ← NOVO
  email?: string;         // ← NOVO
}

export interface PacienteFormData {
  // ... campos existentes
  telefone?: string;      // ← NOVO
  email?: string;         // ← NOVO
}
```

### 3. Formulário de Cadastro
Arquivo [app/pacientes/novo/page.tsx](../app/pacientes/novo/page.tsx):

#### Novos Campos Adicionados
| Campo | Tipo | Validação | Formatação |
|-------|------|-----------|-----------|
| Telefone | input tel | 10 ou 11 dígitos | `(XX) XXXXX-XXXX` |
| E-mail | input email | Regex padrão | - |

#### Novas Funções
```typescript
// Validação de e-mail
validarEmail(email: string): boolean

// Validação de telefone
validarTelefone(telefone: string): boolean

// Formatação automática de telefone
formatTelefone(value: string): string
```

#### Grid Responsivo Atualizado
- **Mobile**: 1 coluna
- **Desktop**: 2 colunas para 6 campos

Ordem dos campos:
1. Nome Completo
2. Data de Nascimento
3. CPF
4. Telefone
5. E-mail
6. Endereço Completo

### 4. Migrações SQL
Arquivo [docs/SUPABASE_MIGRATIONS.sql](./SUPABASE_MIGRATIONS.sql):
```sql
CREATE TABLE pacientes (
  ...
  telefone VARCHAR(20),
  email TEXT UNIQUE,
  ...
);

-- Novo índice para busca rápida por e-mail
CREATE INDEX idx_pacientes_email ON pacientes(email);
```

## ✅ Validações Implementadas

### Telefone
- ✅ Aceita 10 dígitos (fixo) ou 11 dígitos (celular)
- ✅ Formatação automática: `(XX) XXXXX-XXXX`
- ✅ Remove caracteres não numéricos antes de salvar
- ✅ Campo opcional

### E-mail
- ✅ Validação com regex padrão: `^\S+@\S+\.\S+$`
- ✅ Verificação UNIQUE no banco
- ✅ Campo opcional
- ✅ Trim automático

### CPF (Existente)
- ✅ Validação com dígitos verificadores
- ✅ Formatação: `XXX.XXX.XXX-XX`
- ✅ Campo UNIQUE no banco

## 🔗 Fluxo de Dados

```
Usuário preenche formulário
    ↓
Validações client-side (formato, ranges)
    ↓
Formatação automática (CPF, Telefone)
    ↓
Insert no Supabase com remoção de caracteres especiais
    ↓
Banco valida constraints (UNIQUE, NOT NULL)
    ↓
Sucesso → Redirecionamento
```

## 📊 Comparação: Antes vs Depois

### Antes
```
pacientes:
  - id
  - nome_completo
  - data_nascimento
  - cpf
  - endereco_completo
  - created_at
```

### Depois
```
pacientes:
  - id
  - nome_completo
  - data_nascimento
  - cpf
  - telefone          ← NOVO
  - email             ← NOVO
  - endereco_completo
  - created_at
```

## 🎯 Uso no Formulário

```typescript
// Ao salvar, o formulário:
// 1. Valida todos os campos
// 2. Formata CPF: "12345678900" → "123.456.789-00"
// 3. Formata Telefone: "11987654321" → "(11) 98765-4321"
// 4. Remove formatação antes de salvar no BD
// 5. Insere com campos únicos validados

const dataToInsert = {
  nome_completo: "João Silva",
  data_nascimento: "1990-05-15",
  cpf: "12345678900",        // sem formatação
  telefone: "11987654321",   // sem formatação
  email: "joao@example.com",
  endereco_completo: "Rua X, 123..."
};
```

## 🔐 Segurança

- ✅ E-mail com constraint UNIQUE previne duplicatas
- ✅ Telefone sem constraint (pode haver múltiplos registros)
- ✅ Formatação apenas para exibição
- ✅ Dados limpos antes de salvar
- ✅ Validação client-side + constraints de BD

## 📝 Próximos Passos

- [ ] Implementar busca por e-mail
- [ ] Criar API de contato via e-mail
- [ ] Implementar verificação de e-mail (opcional)
- [ ] Adicionar campo de telefone secundário
- [ ] Criar dashboard de comunicação (SMS/WhatsApp)

## 📚 Referências

- [ARCHITECTURE_BLUEPRINT.md](../ARCHITECTURE_BLUEPRINT.md) - Especificação atual
- [database.types.ts](../types/database.types.ts) - Tipos TypeScript
- [SUPABASE_MIGRATIONS.sql](./SUPABASE_MIGRATIONS.sql) - Scripts SQL
