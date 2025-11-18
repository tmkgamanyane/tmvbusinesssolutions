# Afrihost FTP Deployment Script
# Uploads frontend files to tmvbusinesssolutions.co.za root directory

param(
    [string]$FtpServer = "tmvbusinesssolutions.co.za",
    [string]$FtpUser = "tshepisokgamanyane@tmvbusinesssolutions.co.za",
    [string]$FtpPassword = "Moses@1985",
    [string]$LocalSourcePath = ".",
    [string]$RemoteTargetPath = "/"
)

# Define files and folders to upload (exclude backend/server files)
$FilesToUpload = @(
    ".htaccess",
    "index.html",
    "styles.css",
    "pages",
    "scripts",
    "styles",
    "assets",
    "images",
    "logos",
    "cart"
)

$ExcludePatterns = @(
    "node_modules",
    "backend",
    "*.git*",
    "deploy*.ps1",
    "*.json",
    "server.js",
    "start.js",
    "*.md",
    "ecosystem.config.json"
)

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Afrihost FTP Deployment Script" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Function to generate FTP commands
function Generate-FtpScript {
    param(
        [string]$FtpServer,
        [string]$FtpUser,
        [string]$FtpPassword,
        [string]$ScriptPath,
        [array]$FilesToUpload,
        [string]$LocalSourcePath
    )

    $ftpScript = @()
    $ftpScript += "open $FtpServer"
    $ftpScript += "$FtpUser"
    $ftpScript += "$FtpPassword"
    $ftpScript += "cd /"
    $ftpScript += "binary"
    $ftpScript += "prompt off"

    foreach ($item in $FilesToUpload) {
        $itemPath = Join-Path $LocalSourcePath $item
        
        if (Test-Path $itemPath -PathType Leaf) {
            Write-Host "Adding file upload: $item" -ForegroundColor Yellow
            $ftpScript += "put `"$itemPath`" $item"
        }
        elseif (Test-Path $itemPath -PathType Container) {
            Write-Host "Adding folder upload: $item" -ForegroundColor Yellow
            $ftpScript += "mkdir $item"
            $ftpScript += "cd $item"
            
            # Get all files in this directory recursively
            $allFiles = Get-ChildItem -Path $itemPath -File -Recurse
            foreach ($file in $allFiles) {
                $relativePath = $file.FullName.Substring($itemPath.Length).TrimStart("\")
                $relativeDir = Split-Path $relativePath
                
                if ($relativeDir) {
                    $ftpScript += "mkdir `"$relativeDir`""
                    $ftpScript += "cd `"$relativeDir`""
                    $ftpScript += "put `"$($file.FullName)`" `"$($file.Name)`""
                    $ftpScript += "cd .."
                } else {
                    $ftpScript += "put `"$($file.FullName)`" `"$($file.Name)`""
                }
            }
            
            $ftpScript += "cd .."
        }
    }

    $ftpScript += "bye"
    $ftpScript | Out-File -FilePath $ScriptPath -Encoding ASCII
}

# Create temporary FTP script file
$tempFtpScript = [System.IO.Path]::GetTempFileName() + ".txt"
Write-Host "Creating FTP command script..." -ForegroundColor Cyan

Generate-FtpScript -FtpServer $FtpServer -FtpUser $FtpUser -FtpPassword $FtpPassword `
    -ScriptPath $tempFtpScript -FilesToUpload $FilesToUpload -LocalSourcePath $LocalSourcePath

Write-Host "FTP script created at: $tempFtpScript" -ForegroundColor Green
Write-Host ""

# Execute FTP commands
Write-Host "Connecting to Afrihost FTP server..." -ForegroundColor Cyan
Write-Host "Server: $FtpServer" -ForegroundColor Yellow
Write-Host "User: $FtpUser" -ForegroundColor Yellow
Write-Host ""

try {
    # Execute FTP script
    $ftpOutput = & ftp -i -s:$tempFtpScript 2>&1
    
    # Display output
    Write-Host "FTP Output:" -ForegroundColor Cyan
    Write-Host "============" -ForegroundColor Cyan
    $ftpOutput | ForEach-Object {
        if ($_ -match "200|220|226|250|257") {
            Write-Host $_ -ForegroundColor Green
        } elseif ($_ -match "550|530|421|500") {
            Write-Host $_ -ForegroundColor Red
        } else {
            Write-Host $_
        }
    }
    
    Write-Host ""
    Write-Host "============" -ForegroundColor Cyan
    
    # Check for errors
    if ($ftpOutput -match "530|421|500|550") {
        Write-Host "❌ FTP Upload failed! Check credentials and FTP server status." -ForegroundColor Red
        Write-Host ""
        Write-Host "Troubleshooting:" -ForegroundColor Yellow
        Write-Host "1. Verify FTP credentials are correct" -ForegroundColor Yellow
        Write-Host "2. Check if FTP is enabled on Afrihost account" -ForegroundColor Yellow
        Write-Host "3. Ensure firewall/antivirus is not blocking FTP port 21" -ForegroundColor Yellow
        Write-Host "4. Contact Afrihost support if issue persists" -ForegroundColor Yellow
    } else {
        Write-Host "✅ FTP Upload completed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "1. Hard refresh browser (Ctrl+Shift+R)" -ForegroundColor Cyan
        Write-Host "2. Visit: https://tmvbusinesssolutions.co.za" -ForegroundColor Cyan
        Write-Host "3. Open developer console (F12) to check API calls" -ForegroundColor Cyan
        Write-Host "4. Test login/register functionality" -ForegroundColor Cyan
    }
}
catch {
    Write-Host "❌ Error executing FTP: $_" -ForegroundColor Red
}
finally {
    # Cleanup temp file
    if (Test-Path $tempFtpScript) {
        Remove-Item $tempFtpScript -Force
        Write-Host ""
        Write-Host "Temporary files cleaned up." -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "Deployment script completed." -ForegroundColor Cyan
