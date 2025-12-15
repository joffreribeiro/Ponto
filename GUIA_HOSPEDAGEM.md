# 🚀 Guia Completo de Hospedagem - Gestão de Atividades

> Site publicado: https://joffreribeiro.github.io/Ponto/index-refatorado.html

## **Opção 1: GitHub Pages (Recomendado - Grátis e Simples)**

### **Passo 1: Instalar o Git**
1. Baixe o Git: https://git-scm.com/download/win
2. Instale com as opções padrão
3. Reinicie o terminal

### **Passo 2: Criar conta no GitHub**
1. Acesse: https://github.com
2. Clique em "Sign up"
3. Crie sua conta (gratuita)

### **Passo 3: Criar repositório**
1. No GitHub, clique no botão "+" no canto superior direito
2. Selecione "New repository"
3. Nome: `gestao-atividades`
4. Deixe público
5. Clique em "Create repository"

### **Passo 4: Subir os arquivos**
No PowerShell, na pasta do projeto:

```powershell
cd "e:\MEUS DOCUMENTOS\OneDrive\Documentos\Ponto"

# Inicializar Git
git init

# Adicionar todos os arquivos
git add .

# Fazer o primeiro commit
git commit -m "Initial commit - Gestão de Atividades"

# Conectar com o GitHub (substitua SEU-USUARIO pelo seu nome de usuário)
git remote add origin https://github.com/SEU-USUARIO/gestao-atividades.git

# Enviar os arquivos
git branch -M main
git push -u origin main
```

### **Passo 5: Ativar GitHub Pages**
1. No seu repositório, vá em **Settings**
2. No menu lateral, clique em **Pages**
3. Em "Source", selecione **main branch**
4. Clique em **Save**
5. Aguarde 1-2 minutos
6. Seu site estará em: `https://SEU-USUARIO.github.io/gestao-atividades/index-refatorado.html`

---

## **Opção 2: Netlify (Mais Fácil - Arrastar e Soltar)**

### **Passo 1: Criar conta**
1. Acesse: https://www.netlify.com
2. Clique em "Sign up" (pode usar conta do GitHub, Google ou email)

### **Passo 2: Deploy**
1. Após login, clique em "Add new site" > "Deploy manually"
2. **Arraste a pasta do projeto** para a área de upload
3. Aguarde o deploy (30 segundos)
4. Pronto! Você receberá uma URL tipo: `seu-site-123.netlify.app`

### **Passo 3: Configurar domínio personalizado (opcional)**
1. Em "Site settings" > "Domain management"
2. Clique em "Add custom domain"
3. Siga as instruções

---

## **Backend Grátis: Firebase (Google)**

### **Por que usar backend?**
- Sincronizar dados entre dispositivos
- Acessar de qualquer computador
- Backup automático na nuvem
- Múltiplos usuários (opcional)

### **Passo 1: Criar projeto Firebase**
1. Acesse: https://console.firebase.google.com
2. Clique em "Adicionar projeto"
3. Nome: "Gestão de Atividades"
4. Desabilite Google Analytics (opcional)
5. Clique em "Criar projeto"

### **Passo 2: Configurar Firestore Database**
1. No menu lateral, clique em "Firestore Database"
2. Clique em "Criar banco de dados"
3. Selecione "Iniciar no modo de teste" (ou produção com regras)
4. Escolha a localização: `southamerica-east1` (São Paulo)
5. Clique em "Ativar"

### **Passo 3: Obter credenciais**
1. No menu lateral, clique no ícone de engrenagem > "Configurações do projeto"
2. Role até "Seus apps"
3. Clique no ícone `</>` (Web)
4. Apelido do app: "Gestão de Atividades Web"
5. Marque "Configurar também o Firebase Hosting"
6. Clique em "Registrar app"
7. **Copie o código de configuração** (você precisará dele)

### **Passo 4: Integrar Firebase no projeto**

Vou criar o arquivo de integração para você!

---

## **Comparação das Opções**

| Recurso | GitHub Pages | Netlify | Vercel |
|---------|-------------|---------|--------|
| **Grátis** | ✅ Ilimitado | ✅ 100GB/mês | ✅ 100GB/mês |
| **Domínio próprio** | ✅ | ✅ | ✅ |
| **SSL (HTTPS)** | ✅ | ✅ | ✅ |
| **Deploy** | Git | Arrastar ou Git | Git |
| **Facilidade** | Média | Muito Fácil | Média |
| **URL padrão** | usuario.github.io | nome.netlify.app | nome.vercel.app |

---

## **Recomendação Final**

### **Para começar rápido (5 minutos):**
👉 **Netlify** - Arrastar e soltar

### **Para profissional (10 minutos):**
👉 **GitHub Pages** - Versionamento + hospedagem

### **Para sincronizar dados:**
👉 **Firebase** - Backend gratuito até 1GB

---

## **Precisa de Ajuda?**

Escolha uma opção e me avise qual você quer seguir. Posso:
1. ✅ Criar os arquivos de configuração do Firebase
2. ✅ Preparar o projeto para GitHub
3. ✅ Criar instruções específicas para Netlify
4. ✅ Configurar domínio personalizado

**Qual você prefere?**
