# Construccion de strings usando codigos de caracter para evitar problemas de encoding en el script

$pairs = @(
    @{ Find = ([char]0x00C3 + [char]0x00B3); Repl = [char]0x00F3 }   # Ã³ -> o con acento
    @{ Find = ([char]0x00C3 + [char]0x00A1); Repl = [char]0x00E1 }   # Ã¡ -> a con acento
    @{ Find = ([char]0x00C3 + [char]0x00A9); Repl = [char]0x00E9 }   # Ã© -> e con acento
    @{ Find = ([char]0x00C3 + [char]0x00AD); Repl = [char]0x00ED }   # Ã­ -> i con acento
    @{ Find = ([char]0x00C3 + [char]0x00BA); Repl = [char]0x00FA }   # Ãº -> u con acento
    @{ Find = ([char]0x00C3 + [char]0x00B1); Repl = [char]0x00F1 }   # Ã± -> n con tilde
    @{ Find = ([char]0x00C3 + [char]0x00BC); Repl = [char]0x00FC }   # Ã¼ -> u con dieresis
    @{ Find = ([char]0x00C3 + [char]0x0093); Repl = [char]0x00D3 }   # Ã" -> O con acento
    @{ Find = ([char]0x00C3 + [char]0x0081); Repl = [char]0x00C1 }   # ÃÂ -> A con acento
    @{ Find = ([char]0x00C3 + [char]0x0089); Repl = [char]0x00C9 }   # Ã‰ -> E con acento
    @{ Find = ([char]0x00C3 + [char]0x008D); Repl = [char]0x00CD }   # Ã -> I con acento
    @{ Find = ([char]0x00C3 + [char]0x009A); Repl = [char]0x00DA }   # Ãš -> U con acento
    @{ Find = ([char]0x00C3 + [char]0x0091); Repl = [char]0x00D1 }   # Ã' -> N con tilde
)

$srcPath = "src"
$files = Get-ChildItem -Path $srcPath -Recurse -Include "*.tsx","*.ts" | Select-Object -ExpandProperty FullName

$totalFixed = 0

foreach ($file in $files) {
    $bytes = [System.IO.File]::ReadAllBytes($file)
    $content = [System.Text.Encoding]::UTF8.GetString($bytes)
    $original = $content

    foreach ($pair in $pairs) {
        $content = $content.Replace($pair.Find, $pair.Repl)
    }

    if ($content -ne $original) {
        $newBytes = [System.Text.Encoding]::UTF8.GetBytes($content)
        [System.IO.File]::WriteAllBytes($file, $newBytes)
        Write-Host "Fixed: $($file.Replace((Get-Location).Path + '\', ''))"
        $totalFixed++
    }
}

Write-Host ""
Write-Host "Completado. $totalFixed archivo(s) corregido(s)."
