# Improved Afrihost FTP Deployment Script
# Simplified approach with better error handling

param(
    [string]$FtpServer = "ftp://ftp.tmvbusinesssolutions.co.za",
    [string]$FtpUser = "tshepisokgamanyane@tmvbusinesssolutions.co.za",
    [string]$FtpPassword = "Moses@1985"
)

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Afrihost FTP Upload Tool" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Create FTP credential object
$secPassword = ConvertTo-SecureString $FtpPassword -AsPlainText -Force
$credential = New-Object System.Management.Automation.PSCredential($FtpUser, $secPassword)

# Files and directories to upload
$itemsToUpload = @(
    @{ Path = ".\.htaccess"; IsDirectory = $false; Remote = ".htaccess" },
    @{ Path = ".\index.html"; IsDirectory = $false; Remote = "index.html" },
    @{ Path = ".\styles.css"; IsDirectory = $false; Remote = "styles.css" },
    @{ Path = ".\pages"; IsDirectory = $true; Remote = "pages" },
    @{ Path = ".\scripts"; IsDirectory = $true; Remote = "scripts" },
    @{ Path = ".\styles"; IsDirectory = $true; Remote = "styles" },
    @{ Path = ".\assets"; IsDirectory = $true; Remote = "assets" },
    @{ Path = ".\images"; IsDirectory = $true; Remote = "images" },
    @{ Path = ".\logos"; IsDirectory = $true; Remote = "logos" },
    @{ Path = ".\cart"; IsDirectory = $true; Remote = "cart" }
)

Write-Host "Testing FTP Connection..." -ForegroundColor Cyan

try {
    # Test connection first
    $testUri = [Uri]$FtpServer
    $ftpRequest = [System.Net.FtpWebRequest]::Create($testUri)
    $ftpRequest.Method = [System.Net.WebRequestMethods+Ftp]::ListDirectory
    $ftpRequest.Credentials = $credential
    $ftpRequest.KeepAlive = $false
    $ftpRequest.Timeout = 30000
    
    $response = $ftpRequest.GetResponse()
    Write-Host "✅ FTP Connection successful!" -ForegroundColor Green
    $response.Close()
}
catch {
    Write-Host "❌ FTP Connection failed: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting steps:" -ForegroundColor Yellow
    Write-Host "1. Verify server name: $FtpServer" -ForegroundColor Yellow
    Write-Host "2. Verify username: $FtpUser" -ForegroundColor Yellow
    Write-Host "3. Check FTP is enabled in Afrihost control panel" -ForegroundColor Yellow
    Write-Host "4. Verify firewall allows FTP port 21" -ForegroundColor Yellow
    Write-Host "5. Try connecting manually with FileZilla first" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Starting upload process..." -ForegroundColor Cyan
Write-Host ""

$uploadCount = 0
$skipCount = 0

# Function to upload a file
function Upload-FtpFile {
    param(
        [string]$LocalPath,
        [string]$RemoteFileName,
        [string]$FtpServer,
        [System.Management.Automation.PSCredential]$Credential
    )
    
    try {
        $uri = "$FtpServer/$RemoteFileName"
        $ftpRequest = [System.Net.FtpWebRequest]::Create($uri)
        $ftpRequest.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
        $ftpRequest.Credentials = $Credential
        $ftpRequest.KeepAlive = $false
        $ftpRequest.Timeout = 60000
        
        $fileContent = [System.IO.File]::ReadAllBytes($LocalPath)
        $ftpRequest.ContentLength = $fileContent.Length
        
        $requestStream = $ftpRequest.GetRequestStream()
        $requestStream.Write($fileContent, 0, $fileContent.Length)
        $requestStream.Close()
        
        $response = $ftpRequest.GetResponse()
        $response.Close()
        
        return $true
    }
    catch {
        Write-Host "  Error: $_" -ForegroundColor Red
        return $false
    }
}

# Function to create FTP directory
function Create-FtpDirectory {
    param(
        [string]$RemoteDir,
        [string]$FtpServer,
        [System.Management.Automation.PSCredential]$Credential
    )
    
    try {
        $uri = "$FtpServer/$RemoteDir"
        $ftpRequest = [System.Net.FtpWebRequest]::Create($uri)
        $ftpRequest.Method = [System.Net.WebRequestMethods+Ftp]::MakeDirectory
        $ftpRequest.Credentials = $Credential
        $ftpRequest.KeepAlive = $false
        $ftpRequest.Timeout = 30000
        
        $response = $ftpRequest.GetResponse()
        $response.Close()
        return $true
    }
    catch {
        # Directory might already exist, so we'll treat some errors as OK
        return $false
    }
}

# Function to recursively upload directory
function Upload-FtpDirectory {
    param(
        [string]$LocalDir,
        [string]$RemotePath,
        [string]$FtpServer,
        [System.Management.Automation.PSCredential]$Credential
    )
    
    # Create remote directory
    Create-FtpDirectory -RemoteDir $RemotePath -FtpServer $FtpServer -Credential $Credential
    
    # Get all files in directory
    $files = Get-ChildItem -Path $LocalDir -File
    foreach ($file in $files) {
        $remoteFile = "$RemotePath/$($file.Name)"
        Write-Host "Uploading file: $($file.Name)" -ForegroundColor Yellow
        
        if (Upload-FtpFile -LocalPath $file.FullName -RemoteFileName $remoteFile -FtpServer $FtpServer -Credential $Credential) {
            Write-Host "  ✅ Success" -ForegroundColor Green
            script:$uploadCount++
        } else {
            script:$skipCount++
        }
    }
    
    # Recurse into subdirectories
    $subdirs = Get-ChildItem -Path $LocalDir -Directory
    foreach ($subdir in $subdirs) {
        $remoteSubdir = "$RemotePath/$($subdir.Name)"
        Upload-FtpDirectory -LocalDir $subdir.FullName -RemotePath $remoteSubdir -FtpServer $FtpServer -Credential $Credential
    }
}

# Upload each item
foreach ($item in $itemsToUpload) {
    if (-not (Test-Path $item.Path)) {
        Write-Host "⚠️  Skipping: $($item.Remote) (not found locally)" -ForegroundColor Yellow
        $skipCount++
        continue
    }
    
    if ($item.IsDirectory) {
        Write-Host "Uploading directory: $($item.Remote)/" -ForegroundColor Cyan
        Upload-FtpDirectory -LocalDir $item.Path -RemotePath $item.Remote -FtpServer $FtpServer -Credential $Credential
    } else {
        Write-Host "Uploading file: $($item.Remote)" -ForegroundColor Cyan
        if (Upload-FtpFile -LocalPath $item.Path -RemoteFileName $item.Remote -FtpServer $FtpServer -Credential $Credential) {
            Write-Host "  ✅ Success" -ForegroundColor Green
            $uploadCount++
        } else {
            $skipCount++
        }
    }
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Upload Summary" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Files uploaded: $uploadCount" -ForegroundColor Green
Write-Host "Files skipped/failed: $skipCount" -ForegroundColor Yellow
Write-Host ""

if ($uploadCount -gt 0) {
    Write-Host "✅ Upload completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Hard refresh browser: Ctrl+Shift+R" -ForegroundColor Cyan
    Write-Host "2. Visit: https://tmvbusinesssolutions.co.za" -ForegroundColor Cyan
    Write-Host "3. Open F12 developer console to verify API calls" -ForegroundColor Cyan
    Write-Host "4. Test login/register functionality" -ForegroundColor Cyan
} else {
    Write-Host "❌ No files were uploaded. Check the errors above." -ForegroundColor Red
}
