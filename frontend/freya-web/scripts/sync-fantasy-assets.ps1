# Synchronise les assets thèmes Ange / Démon (structure identique dans public/assets/themes/).
param(
  [ValidateSet('demon', 'ange')]
  [string]$Theme = 'demon'
)

$root = Split-Path -Parent $PSScriptRoot
$public = Join-Path $root "public\assets\themes\$Theme"
$design = Join-Path (Split-Path -Parent (Split-Path -Parent $root)) "Assets\Design theme"

if ($Theme -eq 'demon') {
  $src = Join-Path $design "Demon\demon"
} else {
  Write-Error "Sync ange : copier manuellement depuis Design theme/Ange vers public/assets/themes/ange"
  exit 1
}

if (-not (Test-Path $src)) {
  Write-Error "Source introuvable: $src"
  exit 1
}

robocopy $src $public /E /NFL /NDL /NJH /NJS /NDD /NP | Out-Null

$hdr = Join-Path $public "headers"
New-Item -ItemType Directory -Force -Path $hdr | Out-Null
@{
  '01_entete.png'       = 'fonds\accueil.png'
  '02_voyage.png'       = 'fonds\voyage.png'
  '03_date.png'         = 'icone-calendrier.png'
  '04_evenement.png'    = 'fonds\evenement.png'
  '05_taches.png'       = 'fonds\taches.png'
  '06_repas.png'        = 'fonds\repas.png'
  '07_planning_meteo.png' = 'fonds\planning.png'
}.GetEnumerator() | ForEach-Object {
  $from = Join-Path $public $_.Value
  $to = Join-Path $hdr $_.Key
  if (Test-Path $from) { Copy-Item -Force $from $to }
}

Get-ChildItem (Join-Path $public "animaux") -Filter "Image ChatGPT*" -ErrorAction SilentlyContinue | Remove-Item -Force

$barre = Join-Path $public "icone barre du bas"
$navOut = Join-Path $root "public\assets\nav\$Theme"
$tabs = @('accueil', 'planning', 'repas', 'voyages', 'tele', 'chat', 'budget', 'sport', 'animaux', 'parametres')

if (Test-Path $barre) {
  New-Item -ItemType Directory -Force -Path $navOut | Out-Null
  for ($i = 0; $i -lt $tabs.Length; $i++) {
    $n = $i + 1
    $srcFile = Get-ChildItem $barre -Filter "*-$n.png" | Select-Object -First 1
    if ($srcFile) {
      Copy-Item -Force $srcFile.FullName (Join-Path $navOut "$($tabs[$i]).png")
    }
  }
  Write-Host "Barre du bas $Theme -> $navOut"
} else {
  Write-Host "Pas de dossier 'icone barre du bas' dans $public (barre nav inchangée)."
}

Write-Host "OK: $public"
