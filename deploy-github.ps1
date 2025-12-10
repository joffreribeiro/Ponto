# Script de Deploy para GitHub Pages
# Execute este script DEPOIS de instalar o Git e criar sua conta no GitHub

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DEPLOY - GESTAO DE ATIVIDADES" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se Git está instalado
try {
    $gitVersion = git --version
    Write-Host "✓ Git instalado: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Git não encontrado!" -ForegroundColor Red
    Write-Host "  Instale o Git primeiro: https://git-scm.com/download/win" -ForegroundColor Yellow
    Write-Host "  Depois feche e abra novamente o terminal" -ForegroundColor Yellow
    exit
}

Write-Host ""
Write-Host "=== CONFIGURACAO INICIAL ===" -ForegroundColor Cyan
Write-Host ""

# Solicitar informações do usuário
$nomeUsuario = Read-Host "Digite seu nome completo"
$emailUsuario = Read-Host "Digite seu email (mesmo do GitHub)"
$githubUsername = Read-Host "Digite seu username do GitHub"

# Configurar Git
Write-Host "`nConfigurando Git..." -ForegroundColor Yellow
git config --global user.name "$nomeUsuario"
git config --global user.email "$emailUsuario"
Write-Host "✓ Git configurado" -ForegroundColor Green

Write-Host ""
Write-Host "=== PREPARANDO REPOSITORIO ===" -ForegroundColor Cyan
Write-Host ""

# Navegar para o diretório do projeto
$projectPath = "e:\MEUS DOCUMENTOS\OneDrive\Documentos\Ponto"
Set-Location $projectPath

# Inicializar repositório
Write-Host "Inicializando repositório..." -ForegroundColor Yellow
git init
Write-Host "✓ Repositório inicializado" -ForegroundColor Green

# Criar .gitignore
Write-Host "Criando .gitignore..." -ForegroundColor Yellow
@"
# Arquivos temporários
*.tmp
*.log
.DS_Store
Thumbs.db

# Arquivos de backup pessoais
*.bak
*~
"@ | Out-File -FilePath ".gitignore" -Encoding UTF8
Write-Host "✓ .gitignore criado" -ForegroundColor Green

# Adicionar todos os arquivos
Write-Host "Adicionando arquivos..." -ForegroundColor Yellow
git add .
Write-Host "✓ Arquivos adicionados" -ForegroundColor Green

# Fazer commit
Write-Host "Criando commit inicial..." -ForegroundColor Yellow
git commit -m "Initial commit - Sistema de Gestão de Atividades"
Write-Host "✓ Commit criado" -ForegroundColor Green

# Criar branch main
Write-Host "Configurando branch main..." -ForegroundColor Yellow
git branch -M main
Write-Host "✓ Branch configurada" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  PROXIMOS PASSOS:" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "1. Acesse: https://github.com/new" -ForegroundColor Yellow
Write-Host ""
Write-Host "2. Crie um repositório com:" -ForegroundColor Yellow
Write-Host "   - Nome: gestao-atividades" -ForegroundColor White
Write-Host "   - Tipo: Public (público)" -ForegroundColor White
Write-Host "   - NÃO marque 'Initialize with README'" -ForegroundColor White
Write-Host ""
Write-Host "3. Após criar, execute estes comandos:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   git remote add origin https://github.com/$githubUsername/gestao-atividades.git" -ForegroundColor Cyan
Write-Host "   git push -u origin main" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Ative o GitHub Pages:" -ForegroundColor Yellow
Write-Host "   - Settings > Pages > Source: main branch > Save" -ForegroundColor White
Write-Host ""
Write-Host "5. Seu site estará em:" -ForegroundColor Yellow
Write-Host "   https://$githubUsername.github.io/gestao-atividades/index-refatorado.html" -ForegroundColor Green
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

# Abrir GitHub para criar repositório
Write-Host ""
$abrirGithub = Read-Host "Deseja abrir o GitHub agora para criar o repositorio? (S/N)"
if ($abrirGithub -eq "S" -or $abrirGithub -eq "s") {
    Start-Process "https://github.com/new"
}
