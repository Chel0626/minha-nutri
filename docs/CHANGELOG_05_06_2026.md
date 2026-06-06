# 📋 Alteração de Schema - Atualização 05/06/2026

## 🔄 O que Mudou

A estrutura da tabela `pacientes` foi atualizada conforme especificação final do `ARCHITECTURE_BLUEPRINT.md`.

### ❌ Campos Removidos
- `whatsapp` - Será capturado em `anamneses` se necessário
- `historico_medico` - Agora faz parte de `anamneses` como campo estruturado

### ✅ Campos Atualizados
- `nome_completo` (text, NOT NULL) - Obrigatório
- `data_nascimento` (date, NOT NULL) - Obrigatório
- `cpf` (varchar(14), UNIQUE) - Opcional, único no banco
- `endereco_completo` (text) - Opcional

## 📄 Tabelas Criadas

### 1. `pacientes` (Dados Cadastrais)
```sql
id (UUID, PK)
nome_completo (text, NOT NULL)
data_nascimento (date, NOT NULL)
cpf (varchar(14), UNIQUE)
endereco_completo (text)
created_at (timestamptz)
```

### 2. `anamneses` (Histórico de Consultas)
```sql
id (UUID, PK)
paciente_id (FK → pacientes)
data_atendimento (timestamptz)
altura, peso_atual, peso_historico, peso_desejado
indicacao, sobre_o_paciente, exames_com_alteracao
objetivos, queixas, medicamentos_em_uso, suplementos_em_uso
atividade_fisica, recordatorio_alimentar, gostos, aversoes
conduta
created_at (timestamptz)
```

### 3. `pre_configuracoes` (Orientações Padrão)
```sql
id (UUID, PK)
categoria (varchar(50), NOT NULL)
titulo (text, NOT NULL)
conteudo (text, NOT NULL)
created_at (timestamptz)
```

### 4. `prescricoes` (Planos Alimentares)
```sql
id (UUID, PK)
paciente_id (FK → pacientes)
anamnese_id (FK → anamneses, nullable)
cardapio_texto (text, NOT NULL)
orientacoes_selecionadas (UUID[])
created_at (timestamptz)
```

## 🔧 Validações Implementadas

### CPF
- ✅ Formatação automática: `000.000.000-00`
- ✅ Validação de dígitos verificadores (algoritmo oficial)
- ✅ Campo UNIQUE no banco

### Data de Nascimento
- ✅ Não permite datas no futuro
- ✅ Validação de formato ISO

### Campos Obrigatórios
- ✅ Nome completo é obrigatório
- ✅ Data de nascimento é obrigatória
- ✅ Outros campos são opcionais

## 📝 Arquivos Afetados

| Arquivo | Alteração |
|---------|-----------|
| [types/database.types.ts](../types/database.types.ts) | Atualizadas interfaces de tipos |
| [app/pacientes/novo/page.tsx](../app/pacientes/novo/page.tsx) | Reformulado com novos campos |
| [docs/SUPABASE_MIGRATIONS.sql](../docs/SUPABASE_MIGRATIONS.sql) | Scripts SQL criados |
| [SETUP.md](../SETUP.md) | Guia de configuração completo |

## 🚀 Próximos Passos

1. **Executar Migrações**: Copiar SQL de `docs/SUPABASE_MIGRATIONS.sql` e executar no Supabase
2. **Configurar `.env.local`**: Adicionar credenciais do Supabase
3. **Testar Formulário**: Acessar `/pacientes/novo` e criar um paciente
4. **Implementar Anamnese**: Criar página `/app/anamneses/nova/page.tsx`
5. **Vincular Prescrições**: Atualizar fluxo de prescrição para usar `anamnese_id`

## 💡 Observações

- Os campos originais `whatsapp` e `historico_medico` foram substituídos por uma estrutura mais completa na tabela `anamneses`
- CPF é único no banco, prevenindo duplicatas
- Todos os timestamps usam `timestamptz` para melhor controle de timezone
- Índices foram criados para melhorar performance de buscas

## 📚 Referências

- [ARCHITECTURE_BLUEPRINT.md](../ARCHITECTURE_BLUEPRINT.md) - Especificação completa
- [SETUP.md](../SETUP.md) - Guia passo-a-passo
- [docs/SUPABASE_MIGRATIONS.sql](../docs/SUPABASE_MIGRATIONS.sql) - Scripts de banco de dados
