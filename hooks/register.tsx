import type { Register } from 'claude-code'

// Toda chamada a uma ferramenta de MCP (mcp__<servidor>__<ferramenta>), do agente
// principal ou de um subagente, abre a telinha e entra nela em linguagem simples.
// Fechar a telinha vale até a próxima chamada de MCP; /telinha-mcp reabre.

const PAINEL = 'telinha-mcp'
const MAX_LINHAS = 100

type Linha = { id: string; mcp: string; acao: string; quem: string; estado: 'rodando' | 'ok' | 'erro' }

const NOME_DO_MCP: Record<string, string> = {
  github: 'MCP do GitHub',
  'supabase-local': 'MCP do Supabase (produção!)',
  supabase: 'MCP do Supabase',
  '3dprintflow-marketing': 'MCP de marketing',
  playwright: 'MCP do navegador',
  context7: 'MCP de documentação',
}

const PREFIXO_DO_MCP: Record<string, string> = {
  d1ac7f27: 'MCP do Gmail',
}

const VERBO: Record<string, string> = {
  get: 'buscar', read: 'ler', list: 'listar', search: 'pesquisar', find: 'procurar',
  create: 'criar', add: 'adicionar', write: 'gravar', update: 'atualizar', edit: 'editar',
  delete: 'apagar', remove: 'remover', merge: 'mesclar', apply: 'aplicar', execute: 'executar',
  run: 'rodar', deploy: 'publicar', generate: 'gerar', fork: 'copiar', push: 'enviar',
  request: 'pedir', assign: 'atribuir', reset: 'resetar', rebase: 'rebasear', query: 'consultar',
  capture: 'capturar', fetch: 'buscar', navigate: 'abrir', click: 'clicar', type: 'digitar',
}

const PALAVRA: Record<string, string> = {
  issue: 'issue', issues: 'issues', pull: 'pull', request: 'request', requests: 'requests',
  comment: 'comentário', comments: 'comentários', branch: 'branch', branches: 'branches',
  file: 'arquivo', files: 'arquivos', contents: 'conteúdo', commit: 'commit', commits: 'commits',
  label: 'etiqueta', labels: 'etiquetas', release: 'versão', releases: 'versões', tag: 'tag', tags: 'tags',
  repository: 'repositório', repositories: 'repositórios', users: 'usuários', user: 'usuário',
  me: 'meu usuário', code: 'código', review: 'revisão', reply: 'resposta', latest: 'mais recente',
  migration: 'migration', migrations: 'migrations', sql: 'SQL', tables: 'tabelas', table: 'tabela',
  logs: 'logs', advisors: 'alertas', extensions: 'extensões', edge: 'edge', function: 'function',
  functions: 'functions', project: 'projeto', url: 'endereço', keys: 'chaves', publishable: 'públicas',
  types: 'tipos', typescript: 'TypeScript', docs: 'documentação', screen: 'tela', screens: 'telas',
  features: 'funcionalidades', changelog: 'novidades', brand: 'marca', kit: 'kit', stats: 'números',
  public: 'públicos', demo: 'demonstração', story: 'roteiro', team: 'time', teams: 'times',
  members: 'membros', collaborators: 'colaboradores', projects: 'projetos', copilot: 'Copilot',
  sub: 'sub', pending: 'pendente', to: 'em', by: 'por', of: 'de',
}

// Os casos em que montar palavra por palavra fica estranho.
const FRASE: Record<string, string> = {
  pull_request_read: 'ler pull request',
  issue_read: 'ler issue',
  issue_write: 'criar/editar issue',
  label_write: 'criar/editar etiqueta',
  get_me: 'ver o próprio usuário',
  search_issues: 'buscar issue',
  list_issues: 'listar issues',
  apply_migration: 'aplicar migration',
  execute_sql: 'rodar SQL',
  get_project_url: 'ver o endereço do projeto',
  search_docs: 'pesquisar na documentação',
}

export function nomeDoMcp(servidor: string): string {
  if (NOME_DO_MCP[servidor]) return NOME_DO_MCP[servidor]
  // conectores do claude.ai chegam só com UUID: casa pelos 8 primeiros caracteres
  const porPrefixo = Object.entries(PREFIXO_DO_MCP).find(([p]) => servidor.startsWith(p))
  if (porPrefixo) return porPrefixo[1]
  const legivel = servidor.replace(/[-_]+/g, ' ').replace(/^plugin /, '')
  return /^[0-9a-f]{8}\b/i.test(servidor) ? 'MCP sem nome' : `MCP ${legivel}`
}

export function acaoLegivel(ferramenta: string): string {
  if (FRASE[ferramenta]) return FRASE[ferramenta]
  const partes = ferramenta.split(/[_\-\s]+|(?<=[a-z])(?=[A-Z])/).map(p => p.toLowerCase()).filter(Boolean)
  if (!partes.length) return ferramenta
  const [primeira, ...resto] = partes
  const verbo = VERBO[primeira]
  const corpo = (verbo ? resto : partes).map(p => PALAVRA[p] ?? p).join(' ')
  return verbo ? `${verbo} ${corpo}`.trim() : corpo
}

// mcp__<servidor>__<ferramenta>; o servidor pode ter "_" no nome, a ferramenta vem depois do último "__".
export function separar(tool: string): { servidor: string; ferramenta: string } | null {
  if (!tool.startsWith('mcp__')) return null
  const resto = tool.slice(5)
  const corte = resto.lastIndexOf('__')
  if (corte <= 0) return null
  return { servidor: resto.slice(0, corte), ferramenta: resto.slice(corte + 2) }
}

async function abrir($: any) {
  try {
    await $.ui.open({ id: PAINEL, title: 'MCPs em uso' })
  } catch {
    // sem superfície que desenhe: fica só a linha de status
  }
}

export const register: Register = on => {
  const linhas: Linha[] = []
  const tipoDoAgente: Record<string, string> = {}

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'telinha-mcp', description: 'Reabre a telinha com as chamadas de MCP desta conversa' })
    return next(e)
  })

  on('command.run', { command: 'telinha-mcp' }, async $ => {
    await abrir($)
    return { text: linhas.length ? 'Telinha de MCP aberta.' : 'Telinha de MCP aberta (nenhum MCP chamado ainda).' }
  })

  on('tool.call', async ($, e, next) => {
    const partes = separar(e.tool)
    if (!partes) return next(e)

    let quem = 'agente principal'
    if (e.agentId) {
      if (!tipoDoAgente[e.agentId]) {
        try {
          const a = (await $.agent.list()).find((x: any) => x.id === e.agentId) as any
          tipoDoAgente[e.agentId] = a ? `subagente ${a.type}${a.description ? ` (${a.description})` : ''}` : 'subagente'
        } catch {
          tipoDoAgente[e.agentId] = 'subagente'
        }
      }
      quem = tipoDoAgente[e.agentId]
    }

    const linha: Linha = {
      id: e.tool_use_id ?? `${e.tool}-${linhas.length}`,
      mcp: nomeDoMcp(partes.servidor),
      acao: acaoLegivel(partes.ferramenta),
      quem,
      estado: 'rodando',
    }
    linhas.push(linha)
    if (linhas.length > MAX_LINHAS) linhas.splice(0, linhas.length - MAX_LINHAS)
    $.ui.status(`🔌 ${linha.mcp}: ${linha.acao}`)
    $.ui.invalidate('ui.render')
    void abrir($)

    try {
      const r = await next(e)
      linha.estado = r.deny !== undefined || (r as any).isError === true ? 'erro' : 'ok'
      return r
    } catch (err) {
      linha.estado = 'erro'
      throw err
    } finally {
      if (!linhas.some(l => l.estado === 'rodando')) $.ui.status(undefined)
      $.ui.invalidate('ui.render')
    }
  })

  on('ui.render', { component: 'Pane', requestId: PAINEL }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const cabem = Math.max(2, Math.floor(((e.viewport?.rows ?? 24) - 3) / 2))
    const marca = { rodando: '⏳', ok: '✓', erro: '✗' } as const
    return (
      <Box flexDirection="column">
        {linhas.length === 0 && <Text dimColor>Nenhum MCP chamado ainda.</Text>}
        {linhas.slice(-cabem).map(l => (
          <Box flexDirection="column">
            <Text bold={l.estado === 'rodando'} color={l.estado === 'erro' ? 'red' : undefined}>
              {marca[l.estado]} {l.mcp}
            </Text>
            <Text dimColor>
              {'   '}chamou a tool de {l.acao} · {l.quem}
            </Text>
          </Box>
        ))}
      </Box>
    )
  })
}
