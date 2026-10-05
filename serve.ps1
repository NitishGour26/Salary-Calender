# Simple static file HTTP server (PowerShell + HttpListener)
param($port = 8080, $root = ".")

Add-Type -AssemblyName System.Web
$rootPath = Resolve-Path $root
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "Serving $rootPath at http://localhost:$port/ - press Ctrl+C to stop."

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $req = $ctx.Request
    $res = $ctx.Response
    try {
      $url = $req.Url.LocalPath
      if ($url -eq "/") { $url = "/index.html" }
      $filePath = Join-Path $rootPath $url.TrimStart("/")
      if (Test-Path $filePath -PathType Leaf) {
        $ext = [IO.Path]::GetExtension($filePath)
        $mime = "application/octet-stream"
        switch ($ext) {
          ".html" { $mime = "text/html; charset=utf-8" }
          ".js"   { $mime = "application/javascript; charset=utf-8" }
          ".css"  { $mime = "text/css; charset=utf-8" }
          ".json" { $mime = "application/json; charset=utf-8" }
          ".png"  { $mime = "image/png" }
          ".jpg"  { $mime = "image/jpeg" }
          ".svg"  { $mime = "image/svg+xml" }
          ".ico"  { $mime = "image/x-icon" }
          ".csv"  { $mime = "text/csv" }
        }
        $bytes = [IO.File]::ReadAllBytes($filePath)
        $res.ContentType = $mime
        $res.ContentLength64 = $bytes.Length
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
      } else {
        $res.StatusCode = 404
        $msg = [Text.Encoding]::UTF8.GetBytes("404 Not Found: $url")
        $res.OutputStream.Write($msg, 0, $msg.Length)
      }
    } catch {
      $res.StatusCode = 500
      $msg = [Text.Encoding]::UTF8.GetBytes("500 Error: " + $_.Exception.Message)
      $res.OutputStream.Write($msg, 0, $msg.Length)
    } finally {
      $res.OutputStream.Close()
      $res.Close()
    }
  }
} finally {
  $listener.Stop()
  $listener.Close()
}
