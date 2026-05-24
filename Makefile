BASE ?= master

.PHONY: pr bump commit wiki develop main

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
	node -e " \
	  const fs = require('fs'); \
	  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8')); \
	  const parts = pkg.version.split('.').map(Number); \
	  if ('$$BUMP' === 'major') { parts[0]++; parts[1] = 0; parts[2] = 0; } \
	  else if ('$$BUMP' === 'minor') { parts[1]++; parts[2] = 0; } \
	  else { parts[2]++; } \
	  pkg.version = parts.join('.'); \
	  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n'); \
	  console.log('==> package.json atualizado para v' + pkg.version); \
	"

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

# ─────────────────────────────────────────────────────────────────────────────
# make wiki
# Gera o patch note da versão atual na pasta wiki/.
# Lê a versão do package.json, compara com $(BASE) e abre o Copilot Chat
# para produzir um changelog estruturado em português.
# Uso: make wiki | make wiki BASE=develop
# Resultado: wiki/v<versão>.md
# ─────────────────────────────────────────────────────────────────────────────
wiki:
	@mkdir -p wiki
	@VERSION=$$(node -p "require('./package.json').version" 2>/dev/null || echo "unreleased"); \
	STATUS=$$(git status --short 2>/dev/null); \
	if [ -z "$$STATUS" ]; then \
	    echo "Nenhuma mudança pendente para documentar."; exit 1; \
	fi; \
	echo "==> Gerando patch notes para v$$VERSION..."; \
	STAT=$$(git diff --stat HEAD 2>/dev/null); \
	DIFF=$$(git diff HEAD -- . \
	    ':(exclude)*.lock' \
	    ':(exclude)package-lock.json' \
	    ':(exclude)yarn.lock' \
	    2>/dev/null | head -n 600); \
	echo "==> Abrindo Copilot Chat para gerar patch notes..."; \
	code chat -r "Gere as patch notes da versão v$$VERSION do projeto.\n\n\
Analise os dados abaixo e produza um documento completo em português.\n\n\
=== ARQUIVOS ALTERADOS ===\n$$STAT\n\n\
=== DIFF (trecho) ===\n$$DIFF\n\n\
--- INSTRUÇÕES ---\n\n\
PASSO 1 — NOME DO ARQUIVO\n\
Identifique o módulo ou tema principal desta versão (ex: ted-transfer, spending-limit, onboarding).\n\
O arquivo DEVE ser salvo em: wiki/v$$VERSION - <tema-principal>.md\n\
Exemplos de nomes válidos:\n\
  wiki/v1.4.2 - ted-transfer.md\n\
  wiki/v2.0.0 - spending-limit-recalc.md\n\
  wiki/v1.9.1 - pix-validation.md\n\n\
PASSO 2 — CONTEÚDO\n\
Escreva em PORTUGUÊS, linguagem simples e direta.\n\
Omita seções sem itens.\n\
Cada item deve descrever O QUÊ mudou, COMO ERA ANTES e COMO FICOU AGORA quando aplicável.\n\n\
Exemplos de qualidade:\n\
  Ruim: 'Atualizado serviço de transferência'\n\
  Bom:  'Transferência TED: campos Bank/BankAccount/BankBranch/BankAccountDigit\n\
         agora são preservados do payload do frontend. Antes eram sobrescritos\n\
         com os dados da conta remetente, fazendo o FitBank rejeitar a operação.'\n\n\
  Ruim: 'Corrigido cálculo de limite'\n\
  Bom:  'Limite diário de gastos: antes calculado com base em extratos ponderados\n\
         (returnToClient:true = 30%), agora usa o availableBalance real do documento\n\
         de balance. Usuário com R$66 passava a ter limite de R$9,56 (errado) → R$33,03 (correto).'\n\n\
PASSO 3 — MUDANÇAS DE CONTRATO (seção obrigatória se houver)\n\
Documente QUALQUER alteração de contrato da API, formato de campo, nomes de propriedades,\n\
tipos, valores obrigatórios que antes eram opcionais, ou comportamentos que mudaram silenciosamente.\n\
Exemplo: 'Campo Bank passou de opcional para obrigatório no endpoint POST /bank-transfer/money-transfer'\n\n\
Template a usar:\n\
---\n\
# v$$VERSION - <tema-principal>\n\n\
> **Data:** $$(date '+%d/%m/%Y') | **Base:** $(BASE)\n\n\
## ✨ Novidades\n\
<!--items-->\n\n\
## 🐛 Correções\n\
<!--items-->\n\n\
## ⚡ Melhorias\n\
<!--items-->\n\n\
## 🔧 Mudanças de comportamento\n\
<!--items: descrever como ERA e como FICOU-->\n\n\
## ⚠️ Mudanças de contrato (breaking / atenção)\n\
<!--campos renomeados, tipos alterados, campos que viraram obrigatórios, formatos que mudaram-->\n\n\
## 🗑️ Removidos\n\
<!--endpoints, campos, funcionalidades removidas-->\n\n\
## 🧪 Cobertura de testes\n\
<!--testes adicionados ou corrigidos e o que eles garantem-->\n\
---"

# Dummy targets para "make pr develop" / "make pr main"
develop main:
	@true
