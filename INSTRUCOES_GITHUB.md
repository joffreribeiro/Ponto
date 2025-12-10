# 🚀 INSTRUÇÕES RÁPIDAS - GITHUB PAGES

## ✅ CHECKLIST

### 1️⃣ Instalar Git
- [ ] Baixar: https://git-scm.com/download/win
- [ ] Instalar com opções padrão
- [ ] Fechar e abrir novamente o terminal
- [ ] Testar: `git --version`

### 2️⃣ Criar Conta no GitHub
- [ ] Acessar: https://github.com/signup
- [ ] Criar conta gratuita
- [ ] Confirmar email

### 3️⃣ Executar Script Automatizado
```powershell
cd "e:\MEUS DOCUMENTOS\OneDrive\Documentos\Ponto"
powershell -ExecutionPolicy Bypass -File deploy-github.ps1
```

### 4️⃣ Após o script, execute:
```powershell
# Conectar com GitHub (substitua SEU-USUARIO)
git remote add origin https://github.com/SEU-USUARIO/gestao-atividades.git

# Enviar arquivos
git push -u origin main
```

### 5️⃣ Ativar GitHub Pages
1. No GitHub, vá no repositório `gestao-atividades`
2. Clique em **Settings** (configurações)
3. No menu lateral, clique em **Pages**
4. Em "Source", selecione: **main branch**
5. Clique em **Save**
6. Aguarde 2 minutos

### 6️⃣ Acessar seu site
```
https://SEU-USUARIO.github.io/gestao-atividades/index-refatorado.html
```

---

## 🔧 SE DER ERRO

### Erro: "git: command not found"
**Solução:** Feche e abra novamente o terminal após instalar o Git

### Erro ao fazer push
**Solução:** Execute primeiro:
```powershell
git config --global user.email "seu-email@exemplo.com"
git config --global user.name "Seu Nome"
```

### Erro de autenticação
**Solução:** Use token pessoal em vez de senha
1. GitHub > Settings > Developer settings > Personal access tokens
2. Generate new token (classic)
3. Use o token como senha ao fazer push

---

## 📞 PRECISA DE AJUDA?

Me avise se encontrar algum erro! 🚀
