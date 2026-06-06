# Setup e Configuração - Plataforma de Nutrição

## 📋 Pré-requisitos

- Node.js 18+ instalado
- Conta no [Supabase](https://supabase.com) (gratuito)
- Git instalado

## 🔧 1. Configuração do Supabase

### 1.1 Criar um novo projeto
1. Acesse [supabase.com](https://supabase.com) e faça login
2. Clique em "New Project" ou "Novo Projeto"
3. Escolha um nome, database password e região
4. Aguarde o projeto ser criado (pode levar alguns minutos)

### 1.2 Executar migrações de banco de dados
1. No painel do Supabase, acesse **SQL Editor**
2. Crie uma nova query
3. Copie o conteúdo de `docs/SUPABASE_MIGRATIONS.sql`
4. Cole no editor SQL do Supabase
5. Clique em "Run" ou "Executar"

### 1.3 Obter as credenciais
1. No painel do Supabase, acesse **Settings → API**
2. Copie:
   - `Project URL` → será sua `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → será sua `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 🚀 2. Configuração Local

### 2.1 Instalar dependências
```bash
npm install
# ou
yarn install
```

### 2.2 Configurar variáveis de ambiente
1. Na raiz do projeto, crie um arquivo `.env.local`
2. Cole o seguinte conteúdo:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima-aqui
```

Substitua pelos valores reais obtidos em **1.3**

### 2.3 Inicializar o servidor de desenvolvimento
```bash
npm run dev
# ou
yarn dev
```

A aplicação estará disponível em `http://localhost:3000`

## 📦 Instalação de Dependências

As dependências principais já deverão estar no `package.json`:

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "@supabase/supabase-js": "^2.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "tailwindcss": "^3.0.0"
  }
}
```

Se alguma dependência estiver faltando, instale manualmente:

```bash
npm install @supabase/supabase-js
npm install -D tailwindcss postcss autoprefixer
```

## 🎯 Uso Básico

### Dashboard Principal (`/`)
- Página de boas-vindas com 4 ações rápidas
- Acesso direto a todas as funcionalidades principais

### Cadastrar Paciente (`/pacientes/novo`)
- Formulário para registrar novos pacientes
- Campos: Nome, Data de Nascimento, CPF, Endereço
- CPF é validado e formatado automaticamente

### Nova Anamnese (`/anamneses/nova`) - *Em desenvolvimento*
- Ficha de atendimento clínico detalhada
- Todos os campos de histórico médico

### Criar Prescrição (`/prescricoes/nova`)
- Seleção de paciente
- Digitação do cardápio
- Seleção de orientações pré-configuradas
- Geração de PDF (futuro)

### Pré-Configurações (`/configuracoes`) - *Em desenvolvimento*
- Cadastro de orientações padrão
- Agrupadas por categoria

## 📁 Estrutura do Projeto

```
minha-nutri/
├── app/
│   ├── layout.tsx              # Layout global
│   ├── page.tsx                # Dashboard principal
│   ├── pacientes/novo/page.tsx # Cadastro de pacientes
│   ├── anamneses/nova/page.tsx # Nova anamnese
│   ├── prescricoes/nova/page.tsx # Nova prescrição
│   └── configuracoes/page.tsx  # Pré-configurações
├── components/
│   ├── FormComponents.tsx       # Componentes de formulário reutilizáveis
│   └── PageComponents.tsx       # Componentes de página reutilizáveis
├── lib/
│   └── supabase.ts             # Cliente Supabase
├── types/
│   └── database.types.ts       # Tipagens TypeScript
├── hooks/
│   └── useDatabase.ts          # Hooks para data fetching
├── docs/
│   └── SUPABASE_MIGRATIONS.sql # Migrações do banco de dados
└── .env.local                  # Variáveis de ambiente (não commit)
```

## 🔒 Segurança

- ⚠️ **NUNCA** faça commit do arquivo `.env.local`
- `NEXT_PUBLIC_*` são variáveis públicas (seguro expor)
- Use Supabase Row Level Security (RLS) para produção
- Sempre valide dados no servidor

## 🐛 Troubleshooting

### Erro: "Variáveis de ambiente Supabase não encontradas"
- Certifique-se de que `.env.local` existe na raiz do projeto
- Verifique se as variáveis estão preenchidas corretamente
- Reinicie o servidor de desenvolvimento

### Erro ao conectar ao Supabase
- Verifique a URL e chave no `.env.local`
- Confirme que o projeto Supabase está ativo
- Teste a conexão com curl:
  ```bash
  curl -H "Authorization: Bearer SEU_ANON_KEY" \
    https://SEU_PROJETO.supabase.co/rest/v1/pacientes
  ```

### CPF não valida
- Certifique-se de digitar um CPF válido
- A validação usa o algoritmo oficial de CPF
- Teste com um CPF conhecido como válido

## 📚 Recursos Úteis

- [Documentação Next.js](https://nextjs.org/docs)
- [Documentação Supabase](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Componentes React](https://react.dev)

## 🤝 Contribuindo

1. Crie uma branch para sua feature: `git checkout -b feature/nova-feature`
2. Commit suas mudanças: `git commit -am 'Add nova feature'`
3. Push para a branch: `git push origin feature/nova-feature`
4. Abra um Pull Request

## 📝 Licença

Este projeto é privado e exclusivo para uso da nutricionista Carolina.
