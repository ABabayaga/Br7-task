# BR7 Tasks — Sistema de Gestão de Projetos com Gráfico de Gantt

**Data:** 2026-09-11
**Status:** Aprovado para planejamento de implementação

## Contexto

A BR7 (empresa de marketing do Grupo Upper) precisa de uma ferramenta interna
para planejar e acompanhar projetos através de um gráfico de Gantt
interativo. O repositório já existe como monorepo (`backend/` com um
scaffold NestJS + Mongoose vazio, `frontend/` ainda vazio) e será a base
desta construção.

## Objetivo

Construir um sistema interno onde a equipe da BR7 pode:
- Fazer login com usuário/senha.
- Ver um dashboard com todos os projetos.
- Criar/editar/arquivar projetos.
- Dentro de um projeto, ver e editar suas tarefas em um gráfico de Gantt
  interativo (arrastar para reagendar, redimensionar para mudar duração,
  conectar barras para criar dependências).
- Atribuir responsável e acompanhar % de progresso de cada tarefa.

## Fora de escopo (por agora)

- Permissões granulares além de `admin` / `member`.
- Sincronização em tempo real entre múltiplos usuários editando o mesmo
  Gantt simultaneamente.
- Notificações (email, push).
- Anexos de arquivo em tarefas.
- Multi-tenant / múltiplas empresas.
- Recuperação de senha / SSO.

## Modelo de dados (MongoDB via Mongoose)

### User
| campo | tipo | notas |
|---|---|---|
| name | string | obrigatório |
| email | string | único, obrigatório |
| passwordHash | string | bcrypt |
| role | enum(`admin`, `member`) | default `member` |

### Project
| campo | tipo | notas |
|---|---|---|
| name | string | obrigatório |
| description | string | opcional |
| status | enum(`active`, `archived`) | default `active` |
| createdBy | ObjectId → User | |

### Task
| campo | tipo | notas |
|---|---|---|
| name | string | obrigatório |
| projectId | ObjectId → Project | obrigatório |
| startDate | Date | obrigatório |
| endDate | Date | obrigatório, ≥ startDate |
| progress | number (0–100) | default 0 |
| assigneeId | ObjectId → User | opcional |
| dependencies | ObjectId[] → Task | tarefas predecessoras |
| status | enum(`todo`, `in_progress`, `done`) | default `todo` |

**Regra de negócio:** ao definir/alterar `dependencies` de uma tarefa, o
backend valida que não se forma um ciclo (DFS sobre o grafo de
dependências do projeto). Uma tarefa não pode depender de si mesma nem,
transitivamente, de uma tarefa que dependa dela.

## Backend (NestJS)

Estende os módulos `ProjectsModule`/`TasksModule` já existentes (hoje
vazios) e adiciona `AuthModule` e `UsersModule`.

- **AuthModule**
  - `POST /auth/login` — recebe email/senha, retorna JWT.
  - `JwtAuthGuard` aplicado globalmente (exceto rota de login).
- **UsersModule**
  - `POST /users` — cria usuário (somente `admin`).
  - `GET /users` — lista usuários (para popular seletor de responsável).
- **ProjectsModule**
  - `GET /projects` — lista projetos.
  - `POST /projects` — cria projeto.
  - `GET /projects/:id` — detalhe.
  - `PATCH /projects/:id` — editar/arquivar.
  - `DELETE /projects/:id` — remover.
- **TasksModule**
  - `GET /projects/:id/tasks` — lista tarefas do projeto.
  - `POST /projects/:id/tasks` — cria tarefa.
  - `PATCH /tasks/:id` — editar (datas, progresso, responsável,
    dependências — valida ciclo aqui).
  - `DELETE /tasks/:id` — remover (e limpa referências em
    `dependencies` de outras tarefas).

DTOs com `class-validator`/`class-transformer` (já são dependências do
projeto) para validar entrada em todas as rotas.

## Frontend (React + Vite + TypeScript)

Novo app criado do zero em `frontend/`.

- **Autenticação:** tela de login → guarda JWT em `localStorage` →
  instância `axios` injeta `Authorization: Bearer <token>` em toda
  chamada; redireciona para login se receber 401.
- **Rota `/`:** dashboard — lista de projetos em cards/tabela, com
  ação de criar novo projeto e arquivar existente.
- **Rota `/projects/:id`:** tela do Gantt.
  - Renderiza `gantt-task-react` com as tarefas do projeto.
  - Arrastar barra → `PATCH /tasks/:id` com novas datas.
  - Redimensionar barra → `PATCH /tasks/:id` com nova `endDate`.
  - Conectar duas barras → `PATCH /tasks/:id` adicionando dependência
    (erro do backend por ciclo é mostrado como toast).
  - Clique numa tarefa abre painel lateral/modal para editar nome,
    responsável, progresso, ou excluir.
  - Botão "Adicionar tarefa" abre modal de criação.
- **Estilo:** Tailwind CSS, funcional e direto — sem investimento em
  design system elaborado (ferramenta interna).

## Fluxo de dados (resumo)

```
Login → JWT armazenado
  → GET /projects → Dashboard renderiza lista
    → clique em projeto → GET /projects/:id/tasks → Gantt renderiza
      → drag/resize/connect no Gantt → PATCH /tasks/:id → refetch tasks
      → criar tarefa → POST /projects/:id/tasks → refetch tasks
```

## Tratamento de erros

- Backend retorna 400 com mensagem clara em validação de DTO ou ciclo
  de dependência detectado.
- Frontend mostra erros de mutação (drag, resize, connect, form) como
  toast e reverte a UI otimista para o último estado confirmado pelo
  servidor.
- 401 em qualquer chamada → limpa token e redireciona para login.

## Testes

- **Backend:** testes unitários (vitest) para a lógica de detecção de
  ciclo em dependências e para os services de Projects/Tasks/Auth;
  testes e2e (vitest.config.e2e.ts já existe) cobrindo os fluxos
  principais de CRUD e login.
- **Frontend:** testes de componente para o fluxo de login e para as
  interações principais do Gantt (mock da API).

## Decisões já tomadas

- Estrutura: monorepo único na raiz `br7-tasks/` (o `.git` duplicado
  que existia em `backend/` foi removido e substituído por um único
  repositório na raiz).
- Biblioteca de Gantt: `gantt-task-react` (MIT, leve, suporta
  drag/resize/connect).
- Estilo: Tailwind CSS no frontend.
- Banco: MongoDB (já configurado via `MONGODB_URI` em `backend/.env`).
