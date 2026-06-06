# Página de Anamnese - Documentação

## 📋 Visão Geral

A página `/app/anamneses/nova/page.tsx` é a ficha de atendimento clínico completa, onde todos os dados de uma consulta são registrados no Supabase.

## 🏗️ Estrutura da Página

A página é organizada em **3 seções principais**:

### 1. **Seleção de Paciente** (Obrigatório)
- Dropdown que lista todos os pacientes cadastrados
- Campo `paciente_id` é obrigatório
- Integrado com hook `usePacientes()`

### 2. **Dados Antropométricos** (Opcionais)
Campos de medidas físicas do paciente:
- `altura` (numeric 3,2) - em metros (1.0 - 2.5)
- `peso_atual` (numeric 5,2) - "Peso A" em kg (20 - 300)
- `peso_historico` (numeric 5,2) - "Peso H" em kg (20 - 300)
- `peso_desejado` (numeric 5,2) - "Peso D" em kg (20 - 300)

**Validações:**
- Valores numéricos convertidos automaticamente para número
- Range validation para cada campo
- Campos com step 0.01 para precisão

### 3. **Avaliação Clínica** (Opcionais)
Campos de diagnóstico e conduta médica:
- `indicacao` - Motivo principal da consulta
- `sobre_o_paciente` - Informações gerais sobre estilo de vida
- `exames_com_alteracao` - Resultados laboratoriais alterados
- `objetivos` - Metas estabelecidas
- `queixas` - Sintomas relatados
- `conduta` - Plano de ação profissional

### 4. **Rotina e Hábitos** (Opcionais)
Campos sobre a vida do paciente:
- `medicamentos_em_uso` - Lista de medicamentos
- `suplementos_em_uso` - Vitaminas e suplementos
- `atividade_fisica` - Descrição do exercício físico
- `recordatorio_alimentar` - Descrição de 24h alimentares
- `gostos` - Alimentos que o paciente gosta
- `aversoes` - Alimentos que o paciente não gosta

## 🔧 Funcionalidades Técnicas

### Estado do Formulário
```typescript
const [formData, setFormData] = useState<AnamneseFormData>({
  paciente_id: '',
  altura: undefined,
  peso_atual: undefined,
  peso_historico: undefined,
  peso_desejado: undefined,
  // ... outros campos
});
```

### Validações
- ✅ Paciente é obrigatório
- ✅ Pesos validados entre 20-300 kg
- ✅ Altura validada entre 1.0-2.5 metros
- ✅ Trim automático em campos de texto
- ✅ Conversão de números em time real

### Insert no Supabase
```typescript
const { error } = await supabase.from('anamneses').insert([{
  paciente_id,
  altura,
  peso_atual,
  // ... apenas campos preenchidos são incluídos
  data_atendimento: gerada automaticamente pelo banco
}]);
```

### Estados de UI
- Loading spinner durante envio
- Mensagens de sucesso/erro contextualizadas
- Redirecionamento automático após 2 segundos
- Desabilitação de inputs durante envio

## 🎨 Design & UX

### Componentes Reutilizados
- `PageHeader` - Header padronizado
- `Alert` - Alertas de sucesso/erro/info
- `FormInput` - Inputs com validação visual
- `FormTextarea` - Textareas multi-linha
- `FormSelect` - Select para dropdown de pacientes

### Cores por Seção
- 👤 Paciente: Azul
- ⚖️ Dados Antropométricos: Laranja
- 🏥 Avaliação Clínica: Verde
- 🎯 Rotina e Hábitos: Roxo

### Layout Responsivo
- Mobile: 1 coluna
- Tablet/Desktop: Grid de 2 colunas para campos numéricos
- Max-width: 4xl (64rem) para legibilidade

## 📝 Campos Mapeados da Tabela

| Campo | Tipo | Obrigatório | Seção |
|-------|------|-------------|--------|
| paciente_id | uuid | ✅ Sim | Paciente |
| altura | numeric(3,2) | ❌ Não | Antropométrica |
| peso_atual | numeric(5,2) | ❌ Não | Antropométrica |
| peso_historico | numeric(5,2) | ❌ Não | Antropométrica |
| peso_desejado | numeric(5,2) | ❌ Não | Antropométrica |
| indicacao | text | ❌ Não | Clínica |
| sobre_o_paciente | text | ❌ Não | Clínica |
| exames_com_alteracao | text | ❌ Não | Clínica |
| objetivos | text | ❌ Não | Clínica |
| queixas | text | ❌ Não | Clínica |
| medicamentos_em_uso | text | ❌ Não | Rotina |
| suplementos_em_uso | text | ❌ Não | Rotina |
| atividade_fisica | text | ❌ Não | Rotina |
| recordatorio_alimentar | text | ❌ Não | Rotina |
| gostos | text | ❌ Não | Rotina |
| aversoes | text | ❌ Não | Rotina |
| conduta | text | ❌ Não | Clínica |
| data_atendimento | timestamptz | 🔄 Auto | Sistema |
| created_at | timestamptz | 🔄 Auto | Sistema |

## 🚀 Uso

1. **Acessar**: Ir para `/anamneses/nova`
2. **Selecionar Paciente**: Escolher na dropdown
3. **Preencher Dados**: Completar seções relevantes
4. **Salvar**: Clicar em "Salvar Anamnese"
5. **Confirmar**: Será redirecionado para homepage após 2s

## 💡 Próximos Passos

- [ ] Implementar edição de anamnese existente
- [ ] Criar listagem de anamneses por paciente
- [ ] Vincular anamnese ao criar prescrição
- [ ] Gerar PDF com resumo da anamnese
- [ ] Adicionar cálculos automáticos (IMC, etc)

## 📚 Referências

- [ARCHITECTURE_BLUEPRINT.md](../../ARCHITECTURE_BLUEPRINT.md) - Especificação completa
- [database.types.ts](../../types/database.types.ts) - Tipos TypeScript
- [SUPABASE_MIGRATIONS.sql](./SUPABASE_MIGRATIONS.sql) - Schema do banco
