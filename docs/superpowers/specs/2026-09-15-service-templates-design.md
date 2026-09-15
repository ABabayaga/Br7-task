# BR7 Tasks — Templates de Etapas por Tipo de Serviço + Cliente

**Data:** 2026-09-15
**Status:** Aprovado para planejamento de implementação

## Contexto

O documento "Fluxos Operacionais BR7" define, para cada tipo de serviço
contratado (Social Media, Site, Logo/Identidade Visual, Captação de Vídeo
local, Captação de Vídeo externa), uma sequência fixa de etapas com um
setor responsável em cada uma. Hoje o sistema (`br7-tasks`) só tem
`Project`/`Task` genéricos: não existe conceito de Cliente, Tipo de
Serviço ou Setor, e cada projeto começa com o Gantt vazio — o usuário
recria manualmente as mesmas etapas a cada novo projeto.

Esta spec cobre a primeira fatia do gap entre o PDF e o sistema atual:
um **menu de administração de templates de etapas** por tipo de
serviço, usado como base para todo projeto novo, com a possibilidade de
cada **cliente** desativar permanentemente etapas que não se aplicam a
ele (ex: um cliente sem Facebook não precisa da etapa "Facebook" no
template de Social Media).

## Objetivo

- Cadastrar Tipos de Serviço e, para cada um, uma lista ordenada de
  etapas-padrão (nome, setor responsável, duração padrão).
- Cadastrar Clientes.
- Permitir que um cliente tenha, por tipo de serviço, uma lista de
  etapas desativadas (aplicada a todo projeto futuro daquele
  cliente+tipo).
- Ao criar um projeto vinculado a um cliente e tipo de serviço, gerar
  automaticamente as Tasks do Gantt a partir do template (menos as
  etapas desativadas para aquele cliente), já encadeadas por
  dependência e com setor responsável definido.

## Fora de escopo (por agora)

- Status padronizado completo do PDF (seção 10) e diferenciação
  Status/Etapa (seção 11) — o `TaskStatus` atual (`todo`/`in_progress`/
  `done`) não muda nesta spec.
- Campo "Motivo da espera" (seção 12).
- Três relógios de tempo — total/BR7/cliente (seção 15) e pausa de SLA
  (seção 16).
- SLA automático por regra cliente+tipo (seção 9, ex: Upper GR).
- Histórico de movimentações (seção 14).
- Cadastro de cliente como CRM completo (contatos, contratos, etc.) —
  `Client` aqui é só `{ name, active }`.
- Edição de template refletir retroativamente em projetos já criados —
  o template só afeta a **criação** de novos projetos.
- Reordenar/editar template com projetos em andamento usando versões
  antigas — sem versionamento de template nesta spec.

## Modelo de dados (MongoDB via Mongoose)

### ServiceType (novo)
| campo | tipo | notas |
|---|---|---|
| name | string | obrigatório, único |
| active | boolean | default `true` — desativado não aparece na criação de projeto |

### StageTemplate (novo)
| campo | tipo | notas |
|---|---|---|
| serviceTypeId | ObjectId → ServiceType | obrigatório |
| order | number | obrigatório, define a sequência dentro do serviceType |
| name | string | obrigatório (ex: "Desenvolvimento dos criativos para Instagram") |
| defaultSector | enum(`diretoria`, `diretoria_executiva`, `diretoria_criacao`, `criacao`, `desenvolvimento`) | obrigatório |
| defaultDurationDays | number | obrigatório, mínimo 1 — usado para calcular datas ao instanciar |

Índice único em `(serviceTypeId, order)` para evitar duas etapas na
mesma posição.

### Client (novo)
| campo | tipo | notas |
|---|---|---|
| name | string | obrigatório |
| active | boolean | default `true` |

### ClientServiceOverride (novo)
| campo | tipo | notas |
|---|---|---|
| clientId | ObjectId → Client | obrigatório |
| serviceTypeId | ObjectId → ServiceType | obrigatório |
| disabledStageTemplateIds | ObjectId[] → StageTemplate | default `[]` |

Índice único em `(clientId, serviceTypeId)` — um documento por par
cliente+tipo de serviço; se não existir documento, nenhuma etapa está
desativada para aquele cliente.

### User (alterado)
| campo | tipo | notas |
|---|---|---|
| setor | enum(`diretoria`, `diretoria_executiva`, `diretoria_criacao`, `criacao`, `desenvolvimento`) | opcional (admins de sistema sem setor operacional podem ficar sem) |

### Project (alterado)
| campo | tipo | notas |
|---|---|---|
| clientId | ObjectId → Client | obrigatório (novos projetos); projetos existentes ficam sem client até migração manual |
| serviceTypeId | ObjectId → ServiceType | obrigatório (novos projetos) |

**Migração:** `clientId`/`serviceTypeId` são `required: true` no
schema Mongoose para documentos novos; projetos já existentes no banco
não são alterados retroativamente (o schema Mongoose não valida
documentos já persistidos na leitura). O endpoint de criação de
projeto passa a exigir os dois campos.

### Task (alterado)
| campo | tipo | notas |
|---|---|---|
| setor | enum(`diretoria`, `diretoria_executiva`, `diretoria_criacao`, `criacao`, `desenvolvimento`) | opcional — preenchido automaticamente quando a task vem de um template; tasks criadas manualmente podem deixar em branco |
| sourceStageTemplateId | ObjectId → StageTemplate | opcional, só para rastreio; não é validado nem usado em lógica de negócio |

## Backend (NestJS)

Novos módulos: `ServiceTypesModule`, `StageTemplatesModule`,
`ClientsModule`. Todos exigem role `admin` para escrita (seguindo o
padrão já usado em `UsersController`); leitura liberada a qualquer
usuário autenticado (necessário para popular selects no formulário de
criação de projeto).

- **ServiceTypesModule**
  - `GET /service-types` — lista (todos autenticados).
  - `POST /service-types` — cria (`admin`).
  - `PATCH /service-types/:id` — editar nome/active (`admin`).
- **StageTemplatesModule**
  - `GET /service-types/:id/stage-templates` — lista ordenada por
    `order` (todos autenticados).
  - `POST /service-types/:id/stage-templates` — cria etapa; `order`
    calculado como último+1 se omitido (`admin`).
  - `PATCH /stage-templates/:id` — editar nome/setor/duração (`admin`).
  - `DELETE /stage-templates/:id` — remover (`admin`).
  - `PUT /service-types/:id/stage-templates/reorder` — recebe lista
    ordenada de ids, reatribui `order` em lote (`admin`).
- **ClientsModule**
  - `GET /clients` — lista (todos autenticados).
  - `POST /clients` — cria (`admin`).
  - `PATCH /clients/:id` — editar/desativar (`admin`).
  - `GET /clients/:id/overrides/:serviceTypeId` — retorna
    `disabledStageTemplateIds` (todos autenticados); `[]` se não existir
    documento.
  - `PUT /clients/:id/overrides/:serviceTypeId` — substitui a lista de
    ids desativados (`admin`); faz upsert do `ClientServiceOverride`.
- **ProjectsModule (alterado)**
  - `create-project.dto.ts` passa a exigir `clientId` e `serviceTypeId`.
  - `ProjectsService.create()`, após salvar o `Project`, chama
    `TasksService.generateFromTemplate(project)`:
    1. Busca `StageTemplate` do `serviceTypeId`, ordenado.
    2. Busca `ClientServiceOverride` de `(clientId, serviceTypeId)`;
       filtra fora os `disabledStageTemplateIds`.
    3. Se a lista filtrada ficar vazia, não cria nenhuma task (projeto
       nasce sem etapas — caso raro, mas válido).
    4. Itera em ordem: `startDate` da primeira = `project.startDate`
       (novo campo obrigatório em `create-project.dto.ts`, data de
       início escolhida na criação); cada próxima etapa começa no dia
       seguinte ao `endDate` da anterior; `endDate = startDate +
       defaultDurationDays` dias corridos.
    5. Cada Task criada recebe `dependencies: [<id da task anterior>]`
       (a primeira etapa não tem dependência), `setor:
       stageTemplate.defaultSector`, `sourceStageTemplateId:
       stageTemplate._id`, `status: 'todo'`, `progress: 0`,
       `assigneeId` não definido (setor define responsável, usuário
       específico é atribuído depois manualmente).
  - Toda a geração roda em uma transação Mongoose (ou, se réplica sem
    suporte a transação no ambiente de dev, em sequência com rollback
    manual do projeto se a geração de tasks falhar) para não deixar
    projeto órfão sem etapas por erro de template.

DTOs novos (`create-service-type.dto.ts`,
`create-stage-template.dto.ts`, `reorder-stage-templates.dto.ts`,
`create-client.dto.ts`, `update-client-override.dto.ts`) seguindo o
padrão `class-validator` já usado no projeto.

## Frontend (React + Vite + TypeScript)

Duas novas seções na sidebar (visíveis só para `admin`, seguindo o
padrão de `TaskEditModal`/páginas atuais):

- **`/templates`** — lista de Tipos de Serviço (criar/editar/desativar
  inline). Clicar em um tipo abre `/templates/:serviceTypeId` com a
  lista ordenável (drag handle, reordenar via `PUT .../reorder`) de
  etapas: nome, setor (select fixo dos 5 valores), duração em dias.
  Modal de criar/editar etapa reaproveita o padrão do
  `TaskEditModal` existente.
- **`/clients`** — lista de clientes (criar/editar/desativar). Clicar
  em um cliente abre `/clients/:clientId` com abas por Tipo de Serviço
  ativo; cada aba lista as etapas daquele template com um switch
  ligado/desligado (estado inicial = não está em
  `disabledStageTemplateIds`); salvar chama
  `PUT /clients/:id/overrides/:serviceTypeId` com a lista atual de ids
  desligados.

**Criação de projeto (`ProjectGanttPage`/Dashboard, alterado):** o
formulário de criar projeto ganha dois selects obrigatórios — Cliente
e Tipo de Serviço — e um campo de Data de início. Ao submeter, `POST
/projects` já devolve o projeto com as tasks geradas; o Gantt abre
populado.

## Tratamento de erros

- Backend: 400 se `clientId`/`serviceTypeId` inexistentes ou
  inativos; 400 se `reorder` enviar ids que não pertencem ao
  `serviceTypeId`; 409 se tentar criar `StageTemplate` com `order`
  duplicado dentro do mesmo `serviceTypeId` (ou o service resolve
  automaticamente, ver acima — 409 só se endpoint de reorder receber
  lista incompleta/duplicada).
- Frontend: erros de mutação nas telas de template/cliente mostrados
  como toast, mesmo padrão já usado no Gantt.

## Testes

- **Backend:** unitários para `TasksService.generateFromTemplate()`
  (ordem correta, cálculo de datas, filtragem de etapas desativadas,
  caso de zero etapas ativas); unitários para reorder de
  `StageTemplate`; e2e cobrindo criação de projeto com template
  aplicando override de cliente.
- **Frontend:** teste de componente para o toggle de etapas na tela de
  cliente e para o novo formulário de criação de projeto com os
  selects obrigatórios.

## Decisões já tomadas

- Template afeta só criação de novos projetos, sem versionamento nem
  retroatividade.
- Setor é um enum fixo dos 5 valores do PDF (sem setor "Cliente" nem
  "Finalizado" — esses continuam representados por `status`/`está com
  BR7 ou cliente`, que ficam para spec futura).
- `Client` fica deliberadamente mínimo (`name`, `active`) nesta spec.
