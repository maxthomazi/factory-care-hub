# Design: PDF das Ordens de Serviço

**Data:** 2026-06-01  
**Status:** Aprovado

## Objetivo

Permitir que técnicos gerem um PDF da Ordem de Serviço para uso em campo e envio ao cliente via WhatsApp/email.

## Decisões de design

- **Geração via impressão do navegador** (`window.print`) — zero dependências novas, funciona no celular, fácil compartilhamento
- **Assinatura:** não exigida — documento simples com dados textuais
- **Fotos:** técnico pode anexar fotos opcionalmente ao concluir a OS
- **Envio ao cliente:** opcional — técnico salva PDF e compartilha manualmente

## Fluxo do usuário

1. Na listagem de OS, cada OS concluída exibe um botão com ícone de impressora
2. Clicar abre `/ordens/:id/pdf` em nova aba
3. A página carrega os dados e dispara `window.print()` automaticamente
4. Botão "Fechar" visível na tela, oculto na impressão

## Conteúdo do PDF

### Cabeçalho
- Nome da empresa (MGM — Máxima Gestão e Manutenção)
- Título: "Ordem de Serviço Nº XXXX"
- Data de emissão

### Dados da OS
- Equipamento, localização, setor
- Tipo de manutenção (corretiva/preventiva)
- Prioridade
- Data de abertura e conclusão
- Solicitante

### Descrição do Serviço
- Problema relatado
- Serviço executado
- Observações técnicas
- Peças/materiais utilizados

### Responsável
- Nome do técnico
- Especialidade

### Fotos (condicional)
- Grade com até 4 fotos anexadas pelo técnico
- Seção omitida se não houver fotos

### Rodapé
- Nome da empresa, data de impressão

## Arquitetura

### Nova rota
- `GET /ordens/:id/pdf` → `src/pages/OsPdf.tsx`

### Componente OsPdf.tsx
- Busca OS por ID no Supabase
- Renderiza layout com CSS `@media print` (menus ocultos, formatação A4)
- Dispara `window.print()` no `useEffect` após carregamento
- Botão "Fechar" com `className="no-print"`

### Upload de fotos
- Campo de upload na tela de conclusão da OS (existente em `OrdensServico.tsx`)
- Armazenado no Supabase Storage — bucket `os-fotos`
- URLs salvas em coluna `fotos text[]` na tabela `ordens_servico`

### Botão na listagem
- Ícone `Printer` (Lucide) em cada card/linha de OS
- `onClick`: `window.open('/ordens/${id}/pdf', '_blank')`

## Mudanças no banco

```sql
-- Adicionar coluna de fotos na tabela ordens_servico
ALTER TABLE public.ordens_servico ADD COLUMN IF NOT EXISTS fotos text[];

-- Criar bucket no Supabase Storage
-- (feito via dashboard ou migration)
```

## Arquivos afetados

| Arquivo | Mudança |
|---------|---------|
| `src/pages/OsPdf.tsx` | Criar (novo) |
| `src/pages/OrdensServico.tsx` | Adicionar botão PDF + upload de fotos |
| `src/App.tsx` | Registrar rota `/ordens/:id/pdf` |
| Supabase | Coluna `fotos text[]` + bucket `os-fotos` |
