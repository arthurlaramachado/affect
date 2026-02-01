# CLAUDE.md - Configurações do Projeto

## Comportamento Obrigatório
1. **Use as Ferramentas:** Você TEM acesso a ferramentas, skills e agentes instalados pelo plugin 'everything-claude-code'. USE-OS. Não apenas planeje, execute.
2. **Workflow TDD:** Sempre que for escrever código, siga estritamente o ciclo Red-Green-Refactor usando a skill de TDD.
3. **Validação:** Nunca considere uma tarefa pronta sem rodar os testes e verificar se a cobertura é > 80%.
4. **Agentes:**
   - Se a tarefa for de arquitetura, invoque o `@architect`.
   - Se for de revisão, invoque o `@code-reviewer`.
   - Se for de planejamento complexo, consulte o `@planner`.

## Comandos Disponíveis
- /plan: Gera um plano de implementação detalhado.
- /tdd: Inicia o ciclo de desenvolvimento (Test -> Code -> Refactor).
- /verify: Roda a suite de verificação completa.
