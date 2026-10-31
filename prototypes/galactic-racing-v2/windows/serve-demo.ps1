param([ValidateRange(1024,65535)][int]$Port = 43874, [switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath($PSScriptRoot)
$info = Get-Content -LiteralPath (Join-Path $root 'build-info.json') -Encoding UTF8 -Raw | ConvertFrom-Json
$listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, $Port)
try { $listener.Start() } catch {
  Write-Host "PORT $Port IS IN USE. Close that server or run START-RACING.bat -Port 43875" -ForegroundColor Red
  exit 1
}
Write-Host "$($info.label) | $($info.simulator)" -ForegroundColor Yellow
Write-Host "Source SHA: $($info.sha)"
Write-Host "Serving THIS extracted folder: $root"
$url = "http://127.0.0.1:$Port/?build=$($info.sha)"
Write-Host "$url | Keep this window open. Ctrl+C stops only this server."
if (!$NoBrowser) { Start-Process $url }
$utf8 = [Text.UTF8Encoding]::new($false)
$types = @{'.html'='text/html; charset=utf-8';'.js'='text/javascript';'.css'='text/css';'.json'='application/json';'.svg'='image/svg+xml';'.png'='image/png';'.jpg'='image/jpeg'}
try {
 while ($true) {
  $client = $listener.AcceptTcpClient()
  try {
   $client.ReceiveTimeout=3000; $client.SendTimeout=3000
   $stream=$client.GetStream(); $header=[Collections.Generic.List[byte]]::new()
   while ($header.Count -lt 8192) {
    $b=$stream.ReadByte(); if ($b -lt 0) { break }; $header.Add([byte]$b)
    $n=$header.Count
    if ($n -ge 4 -and $header[$n-4] -eq 13 -and $header[$n-3] -eq 10 -and $header[$n-2] -eq 13 -and $header[$n-1] -eq 10) { break }
   }
   $line=([Text.Encoding]::ASCII.GetString($header.ToArray()) -split "`r`n")[0]
   $parts=$line -split ' '; $status='404 Not Found'; $body=$utf8.GetBytes('Not found'); $mime='text/plain'
   if ($parts.Count -ge 2 -and $parts[0] -eq 'GET') {
    $relative=[Uri]::UnescapeDataString(($parts[1] -split '\?')[0]).TrimStart('/')
    if (!$relative) { $relative='index.html' }
    $file=[IO.Path]::GetFullPath((Join-Path $root $relative))
    if ($file.StartsWith($root+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $file -PathType Leaf)) {
     $ext=[IO.Path]::GetExtension($file); if ($types.ContainsKey($ext)) {
      $body=[IO.File]::ReadAllBytes($file); $mime=$types[$ext]; $status='200 OK'
     }
    }
   }
   $response=$utf8.GetBytes("HTTP/1.1 $status`r`nContent-Type: $mime`r`nContent-Length: $($body.Length)`r`nCache-Control: no-store`r`nX-Content-Type-Options: nosniff`r`nConnection: close`r`n`r`n")
   $stream.Write($response,0,$response.Length); $stream.Write($body,0,$body.Length)
  } catch { Write-Host 'A local browser connection closed; no external request was made.' }
  finally { $client.Dispose() }
 }
} finally { $listener.Stop() }
