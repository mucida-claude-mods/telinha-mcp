import { test, expect } from 'claude-code/testing'
import { acaoLegivel, nomeDoMcp, separar } from './register'

const base = (on: any, resultado: any = { result: {}, text: 'ok' }) => {
  const abertos: string[] = []
  const status: (string | undefined)[] = []
  on('session.start', () => ({ cwd: '/r' }))
  on('command.register', () => ({ value: undefined }))
  on('ui.open', (_$: any, e: any) => {
    abertos.push(e.id)
    return { value: { isPlaced: true } }
  })
  on('ui.status', (_$: any, e: any) => {
    status.push(e.text)
    return { value: undefined }
  })
  on('agent.list', () => ({ value: [{ id: 'a1', type: 'Explore', description: 'achar issues', status: 'running' }] }))
  on('tool.call', () => resultado)
  on('ui.render', ($: any, e: any) => {
    const { Box } = $.ui.resolve(e)
    return <Box />
  })
  return { abertos, status }
}
const telinha = async ($: any) => {
  const ui = await $.ui.mount({ plugin: 'telinha-mcp', surface: 'terminal', component: 'Pane', requestId: 'telinha-mcp', props: {} })
  return (await ui.findAll({ type: 'Text' })).map((t: any) => t.text).join('|')
}

test('nomes e ações em linguagem simples', async () => {
  expect(separar('mcp__supabase-local__apply_migration')).toEqual({ servidor: 'supabase-local', ferramenta: 'apply_migration' })
  expect(separar('Bash')).toBe(null)
  expect(nomeDoMcp('github')).toBe('MCP do GitHub')
  expect(nomeDoMcp('meu-servidor')).toBe('MCP meu servidor')
  expect(acaoLegivel('search_issues')).toBe('buscar issue')
  expect(acaoLegivel('list_branches')).toBe('listar branches')
  expect(acaoLegivel('add_issue_comment')).toBe('adicionar issue comentário')
  expect(acaoLegivel('get_file_contents')).toBe('buscar arquivo conteúdo')
})

test('chamada de MCP abre a telinha e aparece nela', async ($, on) => {
  const { abertos, status } = base(on)
  await $.session.start({ cwd: '/r' } as any)
  await $.tool.call({ tool: 'mcp__github__search_issues', query: 'x' } as any)
  expect(abertos.includes('telinha-mcp'), abertos.join(',')).toBe(true)
  const t = await telinha($)
  expect(t.includes('MCP do GitHub') && t.includes('chamou a tool de buscar issue') && t.includes('agente principal'), t).toBe(true)
  expect(t.includes('✓'), t).toBe(true)
  expect(status.some(s => s?.includes('GitHub')), status.join('|')).toBe(true)
  expect(status[status.length - 1]).toBe(undefined)
})

test('ferramenta que não é de MCP não abre nada', async ($, on) => {
  const { abertos } = base(on)
  await $.session.start({ cwd: '/r' } as any)
  await $.tool.call({ tool: 'Bash', command: 'ls' } as any)
  expect(abertos.length).toBe(0)
  const t = await telinha($)
  expect(t.includes('Nenhum MCP'), t).toBe(true)
})

test('chamada de subagente diz qual subagente foi', async ($, on) => {
  base(on)
  await $.session.start({ cwd: '/r' } as any)
  await $.tool.call({ tool: 'mcp__supabase-local__execute_sql', query: 'select 1', agentId: 'a1' } as any)
  const t = await telinha($)
  expect(t.includes('Supabase (produção!)') && t.includes('rodar SQL') && t.includes('subagente Explore'), t).toBe(true)
})

test('chamada recusada aparece com ✗', async ($, on) => {
  base(on, { deny: 'não' })
  await $.session.start({ cwd: '/r' } as any)
  await $.tool.call({ tool: 'mcp__github__get_me' } as any)
  const t = await telinha($)
  expect(t.includes('✗') && t.includes('ver o próprio usuário'), t).toBe(true)
})

test('/telinha-mcp reabre a telinha', async ($, on) => {
  const { abertos } = base(on)
  await $.session.start({ cwd: '/r' } as any)
  const r = await $.command.run({ command: 'telinha-mcp', args: '' } as any)
  expect(abertos.includes('telinha-mcp')).toBe(true)
  expect(r.text.includes('aberta'), r.text).toBe(true)
})
