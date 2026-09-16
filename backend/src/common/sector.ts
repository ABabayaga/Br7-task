export const SECTORS = [
  'diretoria',
  'diretoria_executiva',
  'diretoria_criacao',
  'criacao',
  'desenvolvimento',
] as const;

export type Sector = (typeof SECTORS)[number];
