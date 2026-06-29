TESTES VISUAIS RÁPIDOS
======================

Objetivo
-------
Checklist e passos rápidos para validar visualmente as mudanças de acessibilidade, contraste, micro-interações e validação de formulários implementadas.

Pré-requisitos
--------------
- Ter um navegador (Chrome/Edge/Firefox) com DevTools disponível.
- Ter Node.js (para rodar o script de auditoria) e/ou Python (para servir a pasta). Opcional.
- Abrir um terminal PowerShell na pasta do projeto:
  ```powershell
  cd "e:\MEUS DOCUMENTOS\OneDrive\Documentos\Ponto"
  ```

Iniciar servidor local (opcional)
--------------------------------
- Para servir os arquivos e abrir via http:
  ```powershell
  python -m http.server 8000
  # depois abra: http://localhost:8000/index-refatorado.html
  ```
- Ou com `npx serve` (se preferir):
  ```powershell
  npx serve -s .
  ```

Rodar auditoria de contraste (opcional)
---------------------------------------
- Já existe um script de auditoria que calcula razões de contraste:
  ```powershell
  node .\scripts\contrast-audit.js
  ```
- A saída aparece em formato de tabela Markdown com pares testados e razão de contraste.

Checklist de verificação (faça na ordem)
---------------------------------------

A. Carregamento e console
- [ ] Abrir `index-refatorado.html` e confirmar que não há erros JS no DevTools (Console).

B. Tema claro / escuro
- [ ] Localizar o botão de tema (`#themeToggle`) no cabeçalho e alternar entre claro/escuro.
- [ ] Verificar visualmente se a troca aplica `data-theme="dark"` no elemento `html` e atualiza cores.

C. Badges e contraste
- [ ] Encontrar badges `.badge--ok`, `.badge--due`, `.badge--overdue`, `.badge--order`.
  - Tema claro: `.badge--ok` deve ser fundo claro com texto escuro legível.
  - Tema escuro: `.badge--ok` deve ser fundo escuro com texto branco legível.
- [ ] Verificar `btn-primary` (texto branco / fundo `--primary`) está nítido.
- [ ] (Opcional) Rodar `node .\scripts\contrast-audit.js` e confirmar PASS nos itens.

D. Navegação por teclado e foco
- [ ] Pressionar `Tab` repetidamente para navegar em página.
  - Elementos interativos (botões, inputs, links) devem exibir foco `:focus-visible` forte.
  - Elementos com `data-action` não nativos devem receber `tabindex=0` e foco visível.
- [ ] Focar um elemento com `data-action` e pressionar `Enter` e `Space`: a ação deve executar (verifique no comportamento ou console).

E. Validação de formulários (UX / ARIA)
- [ ] Em um formulário (ex.: criar/editar atividade), deixe um campo obrigatório vazio e saia do campo (blur):
  - Deve aparecer `.validation-feedback` com `role="status"` e `aria-live="polite"`.
  - O campo deve receber `aria-invalid="true"` e a `.form-group` correspondente deve ter a classe `.invalid`.
- [ ] Preencha com valor válido: a mensagem de erro deve desaparecer e a `.form-group` receber `.valid` e `aria-invalid="false"`.
- [ ] Verifique em DevTools que `validation-feedback` é referenciado por `aria-describedby` no campo.

F. Micro-interactions e redução de movimento
- [ ] Passe o mouse sobre cards e botões: hover deve provocar leve elevação/transform.
- [ ] Em DevTools ou nas Preferências do Sistema, ative `prefers-reduced-motion: reduce` e confirme que animações/transições importantes são reduzidas ou removidas.

G. Capturas e regressão
- [ ] Fazer screenshots de: header (tema claro/escuro), um formulário com erro, badges, card em foco por teclado.
- [ ] Guardar as capturas para comparação futura.

Problemas comuns e onde inspecionar
----------------------------------
- Se um badge mostrar cor inesperada: use DevTools > Elements para inspecionar regras CSS aplicadas (procure `!important` ou regras posteriores que sobrescrevem). 
- Se Enter/Space não ativarem control com `data-action`: verifique se o elemento tem `tabindex` e `role` (feito na inicialização). A inicialização roda em `DOMContentLoaded`.

Checklist concluído
-------------------
Após completar as marcações acima, responda neste issue/PR com: quais items falharam, prints do defeito e o trecho CSS/HTML identificado.

---
Gerado automaticamente pelo assistente — teste rápido para validar acessibilidade visual.
