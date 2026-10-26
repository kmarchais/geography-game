# Run after updating earth.jpg. Normal builds use the checked-in preview.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$source = Join-Path $PSScriptRoot '../public/data/globe/earth.jpg'
$target = Join-Path $PSScriptRoot '../public/data/globe/earth-preview.jpg'
$image = [Drawing.Image]::FromFile([IO.Path]::GetFullPath($source))
$preview = [Drawing.Bitmap]::new(1024, 512)
$graphics = [Drawing.Graphics]::FromImage($preview)
try {
    $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.DrawImage($image, 0, 0, 1024, 512)
    $preview.Save([IO.Path]::GetFullPath($target), [Drawing.Imaging.ImageFormat]::Jpeg)
} finally {
    $graphics.Dispose()
    $preview.Dispose()
    $image.Dispose()
}
