# Publica a versão atual do index.html em https://caixa-joao-giovana.netlify.app
# Uso: clique com o botão direito > "Executar com o PowerShell", ou rode  .\deploy.ps1
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

New-Item -ItemType Directory -Force -Path dist | Out-Null
Copy-Item index.html dist\index.html -Force

$cli = "$env:TEMP\nf\node_modules\.bin\netlify.cmd"
$siteId = "810778df-84d3-4ce0-98bc-657d731b80d2"
if (Test-Path $cli) {
  & $cli deploy --prod --dir dist --site $siteId
} else {
  npx -y netlify-cli@latest deploy --prod --dir dist --site $siteId
}
