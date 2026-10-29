# Publica a versão atual no GitHub Pages (https://jucalast.github.io/caixa/)
# Uso: clique com o botão direito > "Executar com o PowerShell", ou rode .\deploy-gh.ps1
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

git add index.html supabase.sql .gitignore deploy.ps1 deploy-gh.ps1
$status = git status --porcelain
if ($status) {
    git commit -m "deploy: atualizacao da aplicacao"
    git push origin main
    Write-Host "Publicado no GitHub Pages: https://jucalast.github.io/caixa/" -ForegroundColor Green
} else {
    git push origin main
    Write-Host "Repositorio sincronizado: https://jucalast.github.io/caixa/" -ForegroundColor Green
}
