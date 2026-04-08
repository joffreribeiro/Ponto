Pasta de temas gerada a partir dos templates instalados em `.claude/`.

Conteúdo:
- `themes/` - arquivos Markdown com paletas e sugestões de tipografia para cada tema.
- `tokens.json` - mapeamento rápido das cores primárias/acentos/neutras para uso em CSS/JS.

Como usar:
- Copie as cores relevantes de `design/tokens.json` para suas variáveis CSS (CSS custom properties) ou para geração automática de temas no frontend.
- Exemplo rápido (CSS custom properties):

```css
:root {
  --primary: #36454f; /* exemplo: modern-minimalist */
  --accent: #708090;
  --background: #ffffff;
}
```

Próximos passos sugeridos:
- Integrar `design/tokens.json` com o sistema de build (ex.: gerar `:root` CSS via script).
- Executar `design/scripts/design_token_generator.py` (existe em `.claude/skills/ui-design-system/scripts/`) para gerar variantes.
