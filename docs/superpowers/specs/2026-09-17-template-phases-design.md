# BR7 Tasks — Fases nos Templates de Etapas + Setor Cliente

**Data:** 2026-09-17
**Status:** Aprovado para planejamento de implementação

## Contexto

O usuário pediu que a tela de administração de templates (`/tipos-servico/:id/etapas`,
construída na spec `2026-09-15-service-templates-design.md`) siga o mesmo
padrão visual/organizacional usado num processo de implantação de outro
cliente (Upper): etapas agrupadas em **Fases** nomeadas, coloridas, com uma
faixa de dias informativa, cada etapa podendo ser arquivada além de
excluída, e um rótulo de setor responsável por etapa — incluindo etapas que
ficam com o cliente, que hoje são atribuídas por convenção a um setor
interno (decisão da spec anterior, revertida aqui).

## Objetivo

- Agrupar etapas de um tipo de serviço em Fases nomeadas/coloridas, com uma
  faixa de dias informativa (`dias 1–60`), sem afetar o cálculo de datas do
  Gantt.
- Permitir arquivar (não só excluir) Fases e Etapas.
- Adicionar `cliente` como valor válido de Setor, e corrigir os dados do
  seed (`SERVICE_TYPE_SEEDS`) para usar `cliente` nas etapas que o PDF
  descreve como "está com: Cliente", em vez do setor interno usado por
  convenção.

## Fora de escopo

- Qualquer mudança na lógica de geração de datas/dependências do Gantt
  (`TasksService.generateFromTemplate`) — Fase é só agrupamento visual e
  informativo; a sequência de geração continua vindo do campo `order`
  plano do `StageTemplate`, ignorando fronteiras de fase.
- A etiqueta "Obrigatória" vista na screenshot de referência — descartada
  a pedido do usuário.
- O setor "Implantação" da screenshot de referência — era ilustrativo do
  outro sistema, não vira setor nosso.
- A aba "Visão Geral" da screenshot — não detalhada, fora de escopo; a
  tela de template continua de página única.
- Migração retroativa dos dados já semeados: as 57 etapas dos 5 tipos de
  serviço já existentes continuam sem Fase (`phaseId: null`) até o admin
  organizá-las manualmente pelo menu.

## Modelo de dados (MongoDB via Mongoose)

### Sector (alterado)
`backend/src/common/sector.ts`: `SECTORS` ganha `'cliente'` como 6º valor.

### Phase (novo)
| campo | tipo | notas |
|---|---|---|
| serviceTypeId | ObjectId → ServiceType | obrigatório |
| name | string | obrigatório (ex: "Fase I") |
| color | string | obrigatório, hex (ex: `#2563EB`) — usado no quadrado colorido |
| order | number | obrigatório, sequência de exibição dentro do serviceType |
| startDay | number | obrigatório, mínimo 1 |
| endDay | number | obrigatório, mínimo igual a `startDay` |
| active | boolean | default `true` — arquivada não aparece na lista ativa |

Índice único em `(serviceTypeId, order)`, mesmo padrão de `StageTemplate`.

### StageTemplate (alterado)
| campo | tipo | notas |
|---|---|---|
| phaseId | ObjectId → Phase | opcional — etapa sem fase é válida |
| active | boolean | default `true` — arquivada não é usada na geração de tasks |

**Validação de negócio:** ao definir `phaseId` numa etapa, o backend
confere que a Fase pertence ao mesmo `serviceTypeId` da etapa (400 se não
pertencer).

**Ao excluir uma Phase:** todas as `StageTemplate` que a referenciam têm
`phaseId` limpo (`$unset`), não são excluídas.

**Geração de projeto (alterado):** `ProjectsService.create()` passa a
filtrar `stageTemplates.filter(s => s.active)` antes de aplicar o filtro
de etapas desativadas por cliente (já existente) — uma etapa arquivada
nunca é usada em projeto novo, independentemente do cliente.

## Backend (NestJS)

Novo módulo `PhasesModule`, no mesmo padrão de `StageTemplatesModule`
(importa `ServiceTypesModule` para validar o `serviceTypeId`):

- `GET /service-types/:serviceTypeId/phases` — lista ordenada (todos
  autenticados).
- `POST /service-types/:serviceTypeId/phases` — cria (`admin`).
- `PATCH /phases/:id` — editar nome/cor/startDay/endDay/active
  (`admin`) — arquivar é só `{ active: false }` neste mesmo endpoint,
  sem rota separada (mesmo padrão de `ServiceType`/`Client`).
- `DELETE /phases/:id` — remove a Phase e desassocia (`$unset phaseId`)
  as `StageTemplate` que a referenciavam (`admin`).
- `PUT /service-types/:serviceTypeId/phases/reorder` — reordenação em
  duas fases, igual `StageTemplatesService.reorder()` (`admin`).

`StageTemplatesModule` (alterado):
- `create-stage-template.dto.ts` / `update-stage-template.dto.ts` ganham
  `phaseId?: string` opcional; `update-stage-template.dto.ts` ganha
  `active?: boolean`.
- `StageTemplatesService.create()`/`.update()` validam, quando
  `phaseId` é enviado, que a Phase existe e pertence ao mesmo
  `serviceTypeId` (400 caso contrário) — precisa injetar `PhasesService`,
  logo `StageTemplatesModule` passa a importar `PhasesModule`.
- `findAllForServiceType()` continua retornando todas as etapas (ativas e
  arquivadas) — a tela de admin mostra as arquivadas visualmente
  distintas; só a geração de projeto filtra por `active`.

`ProjectsModule`/`ProjectsService` (alterado): filtro adicional
`stage.active` antes de gerar tasks (ver seção Modelo de dados acima).

`SERVICE_TYPE_SEEDS` (`seed-service-templates.service.ts`, alterado):
etapas que o PDF descreve como "está com: Cliente" passam a usar
`defaultSector: 'cliente'` em vez do setor interno usado por convenção:

| Tipo de Serviço | Etapa | Setor novo |
|---|---|---|
| Social Media | Material enviado ao cliente | cliente |
| Logo / Identidade Visual | Apresentação ao cliente | cliente |
| Site | Protótipo enviado | cliente |
| Site | Contrato enviado | cliente |
| Site | Site enviado novamente ao cliente | cliente |
| Captação de Vídeo Local | Vídeo enviado | cliente |
| Captação de Vídeo Externa | Orientações enviadas | cliente |
| Captação de Vídeo Externa | Cliente realizando captação | cliente |
| Captação de Vídeo Externa | Aguardando arquivos | cliente |
| Captação de Vídeo Externa | Material enviado | cliente |
| Captação de Vídeo Externa | Aprovação | cliente |

Como o seed é idempotente por nome de `ServiceType` (pula se já existe),
essa correção só se aplica a bancos que ainda não rodaram o seed
(ambientes novos) — não há migração retroativa para bancos já semeados,
consistente com "fora de escopo" acima.

## Frontend (React + Vite + TypeScript)

- `types.ts`: `SECTORS`/`SECTOR_LABELS` ganham `cliente` → "Cliente";
  novo tipo `Phase`; `StageTemplate` ganha `phaseId?: string` e `active:
  boolean`.
- `api/phases.ts` (novo): `listPhases`, `createPhase`, `updatePhase`
  (nome/cor/dias/`active`), `deletePhase`, `reorderPhases`.
- `api/stageTemplates.ts` (alterado): `createStageTemplate`/
  `updateStageTemplate` aceitam `phaseId?: string | null` e
  `updateStageTemplate` aceita `active?: boolean`.
- `StageTemplatesPage.tsx` (redesenhado):
  - Seção **Fases**: lista de cards (quadrado de cor, nome, "dias
    {startDay}–{endDay}"), botões ↑/↓ para reordenar (mesmo padrão de
    Etapas, sem lib de drag-and-drop), "Editar"/"Ativar"/"Desativar"/
    "Remover" textuais, botão "Nova fase" abrindo `PhaseModal` (nome,
    `<input type="color">`, dia inicial, dia final).
  - Seção **Etapas do template padrão**: agrupada por Fase (cabeçalho
    com o quadrado de cor + nome da fase), etapas sem `phaseId` num
    grupo "Sem fase" ao final. `StageTemplateModal` ganha um `<select>`
    de Fase (opção "Sem fase" = `phaseId` vazio) e etapas arquivadas
    aparecem com opacidade reduzida e texto "(arquivada)"; botão
    "Ativar"/"Desativar" ao lado de "Remover".

## Tratamento de erros

- Backend: 400 se `phaseId` não pertence ao `serviceTypeId` da etapa
  (na criação ou edição de `StageTemplate`); 400 se `reorder` de Phase
  receber conjunto de ids incompleto/incorreto (mesma regra de
  `StageTemplate`).
- Frontend: erros de mutação nas novas telas mostrados como já fazemos
  hoje (sem padrão novo).

## Testes

- **Backend:** unitários para `PhasesService` (CRUD, reorder em duas
  fases, desassociação de `StageTemplate` ao excluir); unitários para a
  validação de `phaseId` pertencente ao `serviceTypeId` em
  `StageTemplatesService`; unitário para `ProjectsService.create()`
  ignorando etapas arquivadas; e2e cobrindo criação de Phase, associação
  de etapa a uma Phase, exclusão de Phase desassociando a etapa, e
  geração de projeto pulando etapa arquivada.
- **Frontend:** teste de componente para a nova seção de Fases
  (criar/reordenar/arquivar) e para o agrupamento de etapas por Fase na
  `StageTemplatesPage`.

## Decisões já tomadas

- Fase é puramente organizacional/informativa — não influencia datas
  nem paralelismo no Gantt.
- Sem etiqueta "Obrigatória", sem setor "Implantação", sem aba "Visão
  Geral" — fora de escopo por decisão explícita do usuário.
- Arquivar usa o mesmo padrão de `active` já usado em `ServiceType` e
  `Client` (campo no `PATCH`, sem endpoint dedicado).
