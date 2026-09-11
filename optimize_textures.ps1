Add-Type -AssemblyName System.Drawing

function Optimize-Image($srcPath, $dstPath, $maxWidth, $quality = 88) {
    Write-Host "Processing $srcPath ..."
    $img = [System.Drawing.Image]::FromFile($srcPath)
    $origW = $img.Width
    $origH = $img.Height
    
    if ($origW -gt $maxWidth) {
        $newW = $maxWidth
        $newH = [int]($origH * ($maxWidth / $origW))
    } else {
        $newW = $origW
        $newH = $origH
    }
    
    $bmp = New-Object System.Drawing.Bitmap $newW, $newH
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($img, 0, 0, $newW, $newH)
    $g.Dispose()
    $img.Dispose()
    
    $encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
    $encParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]$quality)
    
    $tempDst = $dstPath + ".tmp"
    $bmp.Save($tempDst, $encoder, $encParams)
    $bmp.Dispose()
    $encParams.Dispose()
    
    Move-Item -Force $tempDst $dstPath
    $newSize = (Get-Item $dstPath).Length
    Write-Host " -> Saved $dstPath : $newSize bytes ($newW x $newH)"
}

$texDir = "c:\Users\elsho\Documents\space\assets\textures"

# Optimize the massive files (mars: 8.4MB, earth_day: 4.6MB, earth_night: 3.1MB, jupiter: 3.1MB)
$targets = @("mars.jpg", "earth_day.jpg", "earth_night.jpg", "jupiter.jpg", "saturn.jpg")

foreach ($t in $targets) {
    $filePath = Join-Path $texDir $t
    Optimize-Image $filePath $filePath 2048 88
}

Write-Host "All textures optimized for web hosting!"
