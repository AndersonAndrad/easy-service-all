BASE ?= master

.PHONY: pr bump commit develop main

# ─────────────────────────────────────────────────────────────────────────────
# make bump
# Analisa os arquivos modificados/adicionados/deletados antes do commit,
# detecta o tipo de bump semver e atualiza o package.json automaticamente.
#   deleted files  → major  (possível breaking change)
#   new files      → minor  (nova funcionalidade)
#   only modified  → patch  (correção / melhoria)
# ─────────────────────────────────────────────────────────────────────────────
bump:
	@echo "==> Analisando arquivos modificados..."
	@STATUS=$$(git status --short 2>/dev/null); \
	if [ -z "$$STATUS" ]; then \
	    echo "Nenhuma mudança pendente para analisar."; exit 1; \
	fi; \
	DELETED=$$(git diff HEAD --name-only --diff-filter=D 2>/dev/null); \
	ADDED=$$(git ls-files --others --exclude-standard 2>/dev/null; git diff HEAD --name-only --diff-filter=A 2>/dev/null); \
	ADDED=$$(echo "$$ADDED" | grep -v '^\.' | grep -v '^$$'); \
	if [ -n "$$DELETED" ]; then \
	    BUMP="major"; \
	elif [ -n "$$ADDED" ]; then \
	    BUMP="minor"; \
	else \
	    BUMP="patch"; \
	fi; \
	echo "==> Arquivos alterados:"; \
	echo "$$STATUS" | sed 's/^/    /'; \
	echo ""; \
	echo "==> Bump detectado: $$BUMP"; \
	npm version $$BUMP --no-git-tag-version; \
	NEW_VERSION=$$(node -p "require('./package.json').version"); \
	echo "==> package.json atualizado para v$$NEW_VERSION"

# ─────────────────────────────────────────────────────────────────────────────
# make commit
# Verifica todas as mudanças pendentes no projeto, abre o Copilot Chat
# para gerar a mensagem de commit convencional em inglês e commita tudo.
# ─────────────────────────────────────────────────────────────────────────────
commit:
	@mkdir -p .releases
	@STATUS=$$(git status --short 2>/dev/null); \
	if [ -z "$$STATUS" ]; then \
	    echo "Nenhuma mudança pendente para commitar."; exit 1; \
	fi; \
	STAT=$$(git diff --stat HEAD 2>/dev/null); \
	DIFF=$$(git diff HEAD -- . \
	    ':(exclude)*.lock' \
	    ':(exclude)package-lock.json' \
	    ':(exclude)yarn.lock' \
	    2>/dev/null | head -n 400); \
	echo "==> Mudanças encontradas:"; \
	echo "$$STATUS" | sed 's/^/    /'; \
	echo ""; \
	echo "==> Abrindo Copilot Chat para gerar mensagem de commit..."; \
	code chat -r "Generate a git commit message in English for the pending changes below.\n\n\
=== CHANGED FILES ===\n$$STAT\n\n\
=== DIFF (excerpt) ===\n$$DIFF\n\n\
Rules:\n\
1. Follow Conventional Commits format: type(scope): subject\n\
   - type: feat | fix | refactor | chore | docs | style | test\n\
   - scope: the affected module or area (e.g. list-employees, date-util, overtime-report)\n\
   - subject: short imperative description in English, no period at the end\n\n\
2. If the primary type is 'fix', add a body paragraph explaining clearly what was broken before the fix.\n\
   For all other types, output the header line only — no body.\n\n\
3. Examples of the expected format:\n\n\
   fix(date-util): parse ISO date strings as local time\n\n\
   parseDateValue was using new Date('YYYY-MM-DD') which is interpreted as UTC midnight.\n\
   In UTC-3 timezones this caused dates to shift one day back.\n\n\
   refactor(list-employees): remove option to show fired employees\n\n\
4. Save the result to: .releases/commit_message.md"; \
	echo ""; \
	read -p "==> Copilot gerou a mensagem em .releases/commit_message.md? Pressione Enter para commitar (Ctrl+C para cancelar)..." _; \
	if [ ! -f .releases/commit_message.md ]; then \
	    echo "Arquivo .releases/commit_message.md não encontrado. Verifique o VS Code."; exit 1; \
	fi; \
	git add -A; \
	git commit -F .releases/commit_message.md; \
	echo "==> Commit realizado com sucesso!"; \
	rm -f .releases/commit_message.md

# ─────────────────────────────────────────────────────────────────────────────
# make pr
# Abre o Copilot Chat para gerar a descrição do Pull Request.
# Uso: make pr | make pr develop | make pr main | make pr BASE=develop
# ─────────────────────────────────────────────────────────────────────────────
pr:
	@echo "==> Buscando $(BASE) do origin..."
	@git fetch origin $(BASE) 2>/dev/null || true
	@mkdir -p .releases
	@echo "==> Abrindo Copilot Chat para gerar descrição do PR (branch atual → $(BASE))..."
	@code chat -r "Gere a descrição do Pull Request seguindo estes passos:\n\n\
1. Compare a branch atual com $(BASE) para obter as mudanças:\n\
   git log origin/$(BASE)..HEAD --oneline --no-merges\n\
   git diff origin/$(BASE)..HEAD --stat\n\n\
2. Com base nos commits e no diff, preencha o template abaixo.\n\n\
3. Na seção Descrição, escreva em LINGUAGEM SIMPLES (que um desenvolvedor de nível JÚNIOR entenda): frases curtas, sem jargão desnecessário. SEPARE em partes com subtítulos:\n\
   - **O que mudou:** uma frase resumindo a mudança.\n\
   - **Por quê:** motivo/contexto em 1-2 frases.\n\
   - **O que foi feito:** lista curta (bullets) do que foi alterado, em termos claros.\n\n\
4. Mantenha o Checklist exatamente como está (itens com [ ] para o autor marcar depois).\n\n\
5. Template a usar:\n\n\
---\n\
# Descrição\n\n\
**O que mudou:**\n\
[uma frase]\n\n\
**Por quê:**\n\
[1-2 frases]\n\n\
**O que foi feito:**\n\
- [item 1]\n\
- [item 2]\n\n\
---\n\n\
# Checklist\n\n\
- [ ] Testei as alterações localmente.\n\
- [ ] Atualizei qualquer documentação relevante.\n\
- [ ] Verifiquei que não há problemas de Lint ou formatação.\n\
- [ ] Confirmei que o código segue as diretrizes de contribuição do projeto.\n\n\
---\n\n\
6. Salve o resultado em: .releases/pr_description.md"

# Dummy targets para "make pr develop" / "make pr main"
develop main:
	@true
