param([string]$DraftUri='')
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Windows.Forms
$root=Join-Path $env:LOCALAPPDATA 'EstimiaMail'
$key='HKCU:\Software\Classes\estimia-mail'
try {
 if (!$DraftUri) {
  Add-Type -AssemblyName Microsoft.VisualBasic
  $site=[Microsoft.VisualBasic.Interaction]::InputBox('Collez l adresse HTTPS de votre application ESTIM IA sur Render (exemple : https://estimia.onrender.com).','Installation ESTIM IA')
  if (!$site) {exit}
  $origin=[Uri]$site
  if ($origin.Scheme -ne 'https' -or $origin.UserInfo -or $origin.Query -or $origin.Fragment -or !$origin.IsDefaultPort) {throw 'Adresse HTTPS simple requise, sans identifiants ni parametres.'}
  $originText=$origin.GetLeftPart([UriPartial]::Authority)
  $candidates=@((Join-Path $env:ProgramFiles 'Mozilla Thunderbird\thunderbird.exe'))
  if (${env:ProgramFiles(x86)}) {$candidates+=Join-Path ${env:ProgramFiles(x86)} 'Mozilla Thunderbird\thunderbird.exe'}
  $candidates+=Join-Path $env:LOCALAPPDATA 'Mozilla Thunderbird\thunderbird.exe'
  $tb=$candidates | Where-Object {Test-Path -LiteralPath $_ -PathType Leaf} | Select-Object -First 1
  if (!$tb) {
   $dialog=New-Object System.Windows.Forms.OpenFileDialog
   $dialog.Title='Selectionner thunderbird.exe';$dialog.Filter='Thunderbird|thunderbird.exe'
   if ($dialog.ShowDialog() -ne 'OK') {exit};$tb=$dialog.FileName
  }
  if ([IO.Path]::GetFileName($tb) -ine 'thunderbird.exe') {throw 'Selectionnez thunderbird.exe.'}
  New-Item $root -ItemType Directory -Force | Out-Null
  $installed=Join-Path $root 'EstimiaMail.ps1'
  if ($PSCommandPath -ne $installed) {Copy-Item -LiteralPath $PSCommandPath -Destination $installed -Force}
  @{origin=$originText;thunderbird=$tb} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $root 'config.json') -Encoding UTF8
  New-Item $key -Force | Out-Null
  Set-Item $key -Value 'URL:ESTIM IA Thunderbird'
  New-ItemProperty $key -Name 'URL Protocol' -Value '' -Force | Out-Null
  New-Item "$key\shell\open\command" -Force | Out-Null
  $powershell=Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
  $command='"'+$powershell+'" -NoProfile -ExecutionPolicy Bypass -File "'+$installed+'" -DraftUri "%1"'
  Set-Item "$key\shell\open\command" -Value $command
  [System.Windows.Forms.MessageBox]::Show('Installation terminee pour '+$originText+'. Retournez dans ESTIM IA, preparez un document, puis cliquez sur Ouvrir Thunderbird avec la piece jointe.','ESTIM IA') | Out-Null
  exit
 }
 if ($DraftUri -cnotmatch '^estimia-mail://draft/([A-Za-z0-9_-]{43})/?$') {throw 'Lien ESTIM IA invalide.'}
 $token=$Matches[1]
 $config=Get-Content -LiteralPath (Join-Path $root 'config.json') -Raw | ConvertFrom-Json
 $origin=[Uri]$config.origin
 if ($origin.Scheme -ne 'https' -or $origin.UserInfo -or !$origin.IsDefaultPort) {throw 'Configuration invalide. Reinstallez le relais.'}
 [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
 # Uniquement le serveur configure. Aucun script distant n est execute.
 $response=Invoke-WebRequest -UseBasicParsing -Uri ($config.origin+'/api/email/bridge-download') -Method Post -ContentType 'application/json' -Body (@{token=$token} | ConvertTo-Json -Compress) -MaximumRedirection 0 -TimeoutSec 45
 if ($response.RawContentLength -gt 36000000) {throw 'Document trop volumineux.'}
 $data=$response.Content | ConvertFrom-Json
 if ($data.kind -notin @('pdf','word')) {throw 'Format invalide.'}
 $bytes=[Convert]::FromBase64String($data.document_base64)
 if ($bytes.Length -gt 25000000 -or $bytes.Length -lt 4) {throw 'Taille invalide.'}
 $ext=if ($data.kind -eq 'pdf') {'.pdf'} else {'.docx'}
 if (($ext -eq '.pdf' -and [Text.Encoding]::ASCII.GetString($bytes,0,4) -ne '%PDF') -or ($ext -eq '.docx' -and ($bytes[0] -ne 80 -or $bytes[1] -ne 75))) {throw 'Contenu du fichier invalide.'}
 $drafts=Join-Path $root 'Dossiers'
 New-Item $drafts -ItemType Directory -Force | Out-Null
 # Supprime seulement les anciens repertoires crees par ce relais, apres 7 jours.
 Get-ChildItem -LiteralPath $drafts -Directory | Where-Object {$_.Name -match '^[a-f0-9]{32}$' -and $_.LastWriteTime -lt (Get-Date).AddDays(-7)} | Remove-Item -Recurse -Force
 $folder=Join-Path $drafts ([Guid]::NewGuid().ToString('N'));New-Item $folder -ItemType Directory | Out-Null
 $file=Join-Path $folder ('Dossier_estimation'+$ext)
 [IO.File]::WriteAllBytes($file,$bytes)
 $bodyFile=Join-Path $folder 'message.txt'
 [IO.File]::WriteAllText($bodyFile,[string]$data.body,(New-Object Text.UTF8Encoding($false)))
 $fileUri=([Uri]$file).AbsoluteUri
 # Encodage URI de chaque champ : aucune interpretation shell du contenu du dossier.
 $compose='subject='+[Uri]::EscapeDataString([string]$data.subject)+',message='+[Uri]::EscapeDataString($bodyFile)+',attachment='+[Uri]::EscapeDataString($fileUri)+',format=text'
 if (!(Test-Path -LiteralPath $config.thunderbird -PathType Leaf)) {throw 'Thunderbird introuvable. Reinstallez le relais.'}
 $process=New-Object Diagnostics.ProcessStartInfo
 $process.FileName=$config.thunderbird;$process.UseShellExecute=$false
 $process.Arguments='-compose "'+$compose+'"'
 [Diagnostics.Process]::Start($process) | Out-Null
} catch {
 [System.Windows.Forms.MessageBox]::Show(('Ouverture impossible : '+$_.Exception.Message+' Repreparez le document ou reinstallez le relais si necessaire.'),'ESTIM IA') | Out-Null
 exit 1
}
