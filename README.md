# telinha-mcp

*"Little MCP screen"* — a Claude Code mod that opens a **pane every time the agent or a subagent calls an MCP tool**, describing the call in plain words:

```
MCP do GitHub — chamou a tool de buscar issue · agente principal   ✓
```

Each line shows which MCP was called, what it was asked (the tool name turned into a short phrase), who called it (main agent or which subagent) and whether it is running, finished or failed. It keeps the last 100 calls. Closing the pane lasts until the next MCP call; `/telinha-mcp` reopens it. The texts on screen are in Portuguese.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install telinha-mcp --marketplace mucida-claude-mods/telinha-mcp
```

Answer `y` to add the marketplace, then choose a scope (user scope shows it in every project).

## How it works

It watches every `tool.call` whose name starts with `mcp__`. Friendly names for servers (`NOME_DO_MCP`) and the words used to describe tools (`VERBO`, `PALAVRA`) are tables at the top of `hooks/register.tsx`; edit them to name your own MCP servers. It never calls the model.

## What it accesses

Hooks `session.start`, `command.run` (`/telinha-mcp`), `tool.call` and `ui.render` (`Pane`). Calls `$.agent.list`, `$.command.register`, `$.ui.open`, `$.ui.status`, `$.ui.invalidate` and `$.ui.resolve`. No files, processes or network.

## Development

```bash
claude plugin validate .
claude plugin test .
```

## Em português

Toda vez que o agente ou um subagente chama uma ferramenta de MCP, abre uma telinha dizendo, em linguagem simples, qual MCP foi chamado, o que pediram a ele, quem chamou e se terminou. Fechou, reabre com `/telinha-mcp`. Os nomes amigáveis dos MCPs ficam numa tabela no início de `hooks/register.tsx`.

## More mods by the same author / Mais mods do mesmo autor

All in one place: **[github.com/mucida-claude-mods](https://github.com/mucida-claude-mods)**

| Mod | What it does |
| --- | --- |
| [warm-me](https://github.com/mucida-claude-mods/warm-me) | Pixel-art fire showing whether the prompt cache is still warm |
| [critical-decisions](https://github.com/mucida-claude-mods/critical-decisions) | Shows the critical decisions the agent made without asking |
| [indicador-de-contexto](https://github.com/mucida-claude-mods/indicador-de-contexto) | Warns when to split or compact the chat (250k / 400k) |
| [novo-chat-ou-aqui](https://github.com/mucida-claude-mods/novo-chat-ou-aqui) | Should this extra step run here or in a new chat? |
| [pendencias](https://github.com/mucida-claude-mods/pendencias) | Chats that ended waiting on you |
| [telinha-mcp](https://github.com/mucida-claude-mods/telinha-mcp) | Which MCP the agent just called, in plain words |
| [faixa-de-terreno](https://github.com/mucida-claude-mods/faixa-de-terreno) | Branch, issue, dirty files and commits ahead of main |

## License

MIT
