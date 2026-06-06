# Guia de Testes - Formulário de Cadastro de Pacientes

## ✅ Testes de Validação

### 1️⃣ Nome Completo

| Entrada | Esperado | Status |
|---------|----------|--------|
| Vazio | ❌ Erro: "Nome completo é obrigatório" | - |
| "   " (espacos) | ❌ Erro: "Nome completo é obrigatório" | - |
| "Carolina" | ✅ Aceito | - |
| "Carolina Silva Pereira" | ✅ Aceito | - |

### 2️⃣ Data de Nascimento

| Entrada | Esperado | Status |
|---------|----------|--------|
| Vazio | ❌ Erro: "Data de nascimento é obrigatória" | - |
| 2025-12-31 (futura) | ❌ Erro: "Data de nascimento não pode ser no futuro" | - |
| 1990-05-15 | ✅ Aceito | - |
| 2010-01-01 | ✅ Aceito | - |

### 3️⃣ CPF (Opcional)

| Entrada | Exibição | Esperado | Status |
|---------|----------|----------|--------|
| "" (vazio) | - | ✅ Aceito (não validado) | - |
| "123" | "123" | ✅ Em digitação | - |
| "12345678901" (inválido) | "123.456.789-01" | ❌ Erro: "CPF inválido" | - |
| "11144477735" (válido) | "111.444.777-35" | ✅ Aceito | - |
| "00000000000" | "000.000.000-00" | ❌ Erro: "CPF inválido" (sequência) | - |

**CPF Válido para Teste:** `111.444.777-35` (faz parte da RFC test set)

### 4️⃣ Telefone (Opcional)

| Entrada | Exibição | Esperado | Status |
|---------|----------|----------|--------|
| "" (vazio) | - | ✅ Aceito (não validado) | - |
| "11" | "(11)" | ✅ Em digitação | - |
| "119876543" (9 dígitos) | "(11) 98765-43" | ❌ Erro: "Telefone inválido (use 10 ou 11 dígitos)" | - |
| "1198765432" (10 dígitos) | "(11) 9876-5432" | ✅ Aceito (fixo) | - |
| "11987654321" (11 dígitos) | "(11) 98765-4321" | ✅ Aceito (celular) | - |
| "abc123" | "(12) 3" | ❌ Erro: "Telefone inválido" | - |

### 5️⃣ E-mail (Opcional)

| Entrada | Esperado | Status |
|---------|----------|--------|
| "" (vazio) | ✅ Aceito (não validado) | - |
| "carolina" | ❌ Erro: "E-mail inválido" | - |
| "carolina@" | ❌ Erro: "E-mail inválido" | - |
| "carolina@exemplo" | ❌ Erro: "E-mail inválido" | - |
| "carolina@exemplo.com" | ✅ Aceito | - |
| "CAROLINA@EXEMPLO.COM" | ✅ Aceito (será salvo em lowercase) | - |

### 6️⃣ Endereço Completo (Opcional)

| Entrada | Esperado | Status |
|---------|----------|--------|
| "" (vazio) | ✅ Aceito (não validado) | - |
| "Rua X, 123" | ✅ Aceito | - |
| "Rua das Flores, 456\nApto 12\nSão Paulo - SP" | ✅ Aceito (multilinhas) | - |

## 🎯 Testes de Fluxo

### Teste 1: Cadastro Completo Válido
```
1. Preencher todos os campos com valores válidos
2. Clicar "Salvar Paciente"
3. Esperado: 
   ✅ Alerta de sucesso
   ✅ Formulário resetado
   ✅ Redirecionamento para home após 2s
4. Verificar no Supabase:
   INSERT registrado com created_at
   email em LOWERCASE
   cpf sem formatação
   telefone sem formatação
```

### Teste 2: Cadastro Mínimo Válido
```
1. Preencher apenas:
   - Nome: "Carolina Silva"
   - Data: "1990-05-15"
2. Deixar em branco: CPF, Telefone, Email, Endereço
3. Clicar "Salvar Paciente"
4. Esperado:
   ✅ Alerta de sucesso
   ✅ Registro salvo com apenas 2 campos
5. Verificar no Supabase:
   cpf IS NULL
   telefone IS NULL
   email IS NULL
   endereco_completo IS NULL
```

### Teste 3: Validações Obrigatórias
```
1. Clicar "Salvar Paciente" sem preencher nada
2. Esperado: ❌ Erro "Nome completo é obrigatório"
3. Preencher Nome, deixar Data vazia
4. Clicar "Salvar Paciente"
5. Esperado: ❌ Erro "Data de nascimento é obrigatória"
```

### Teste 4: Email Duplicado (UNIQUE)
```
1. Cadastrar: "carolina@exemplo.com"
2. Tentar cadastrar novamente: "carolina@exemplo.com"
3. Esperado: 
   ❌ Erro do Supabase (constraint violation)
   Mostrar alerta de erro ao usuário
4. Verificar no terminal/logs:
   "duplicate key value violates unique constraint"
```

### Teste 5: CPF Duplicado (UNIQUE)
```
1. Cadastrar: CPF "111.444.777-35"
2. Tentar cadastrar novamente: "11144477735"
3. Esperado:
   ❌ Erro do Supabase (constraint violation)
   Mostrar alerta de erro ao usuário
4. Note: Formatação não importa (111.444.777-35 == 11144477735)
```

### Teste 6: Formatação Automática
```
1. Digitar no CPF: "11144477735"
2. Exibição: "111.444.777-35" ✅
3. Ao salvar: Remove formatação "11144477735" ✅
4. Digitar Telefone: "11987654321"
5. Exibição: "(11) 98765-4321" ✅
6. Ao salvar: Remove formatação "11987654321" ✅
```

## 🐛 Testes de Edge Cases

| Cenário | Entrada | Comportamento Esperado |
|---------|---------|------------------------|
| CPF com espaços | "111 444 777-35" | Remove espaços, valida, formata |
| Email com espaço | " carolina@ex.com " | Remove espaços (trim) |
| Telefone incompleto | "11" | Não valida até 10+ dígitos |
| Data em 29/02 leap year | "2020-02-29" | ✅ Válido |
| Data em 29/02 non-leap | "2019-02-29" | ❌ Data inválida |
| Nome com acentos | "João José da Silva" | ✅ Aceito |
| Email com +tag | "carolina+nutri@ex.com" | ✅ Aceito (regex permite) |

## 📊 Checklist de Teste

- [ ] Validação obrigatória de Nome
- [ ] Validação obrigatória de Data
- [ ] CPF com dígitos verificadores corretos
- [ ] Telefone aceita 10 e 11 dígitos
- [ ] Email com formato válido
- [ ] Formatação automática em tempo real
- [ ] Supabase insert com dados limpos
- [ ] Email LOWERCASE no banco
- [ ] Constraint UNIQUE em email
- [ ] Constraint UNIQUE em cpf
- [ ] created_at gerado automaticamente
- [ ] Alerta de sucesso exibido
- [ ] Formulário resetado após sucesso
- [ ] Redirecionamento funciona
- [ ] Erros de constraint mostram ao usuário
- [ ] Loading spinner ativo durante insert

## 🚀 Comando para Limpar Testes

Se precisar limpar dados de teste do Supabase:

```sql
-- Listar pacientes de teste
SELECT id, nome_completo, email, cpf FROM pacientes 
WHERE email LIKE '%teste%' OR nome_completo LIKE '%Teste%';

-- Deletar pacientes de teste
DELETE FROM pacientes 
WHERE email = 'teste@exemplo.com' 
   OR cpf = '11144477735';
```

## 📝 Resultado dos Testes

Preencher após executar:

```
Data do Teste: ___________
Tester: ____________________

Validações:
- [ ] Nome completo: Passou
- [ ] Data de nascimento: Passou
- [ ] CPF: Passou
- [ ] Telefone: Passou
- [ ] E-mail: Passou
- [ ] Endereço: Passou

Fluxos:
- [ ] Cadastro completo: Passou
- [ ] Cadastro mínimo: Passou
- [ ] Validações obrigatórias: Passou
- [ ] Email duplicado: Passou
- [ ] CPF duplicado: Passou
- [ ] Formatação automática: Passou

Observações: _____________________
Problemas encontrados: _____________
```
