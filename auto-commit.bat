@echo off
setlocal enabledelayedexpansion
REM Script untuk auto commit setiap perubahan file secara terpisah
REM Author: GitHub Copilot
REM Date: 2026-01-06

echo ============================================
echo   AUTO COMMIT - Git Script
echo ============================================
echo.

REM Check if git is installed
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Git tidak terinstall!
    echo Silakan install Git terlebih dahulu
    pause
    exit /b 1
)

REM Check if we're in a git repository
git rev-parse --git-dir >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Bukan git repository!
    echo Jalankan 'git init' terlebih dahulu
    pause
    exit /b 1
)

echo Mengambil daftar file yang berubah...
echo.

REM Get all changed/untracked files and save to temp file
git status --short > temp_files.txt

REM Count files
for /f %%a in ('type temp_files.txt ^| find /c /v ""') do set FILE_COUNT=%%a

if %FILE_COUNT%==0 (
    echo Tidak ada perubahan untuk di-commit
    del temp_files.txt
    pause
    exit /b 0
)

echo Ditemukan %FILE_COUNT% file yang berubah:
echo --------------------------------------------
type temp_files.txt
echo --------------------------------------------
echo.

set /p CONFIRM="Lanjutkan commit satu persatu? (y/n): "
if /i not "%CONFIRM%"=="y" (
    echo Dibatalkan
    del temp_files.txt
    pause
    exit /b 0
)

echo.
echo Memulai auto commit...
echo.

set COUNT=0
set SUCCESS=0
set FAILED=0

REM Process each file
for /f "tokens=1,* delims= " %%a in (temp_files.txt) do (
    set /a COUNT+=1
    
    echo --------------------------------------------
    echo [!COUNT!/%FILE_COUNT%] Processing: %%b
    echo --------------------------------------------
    
    REM Get filename and extension
    for %%f in ("%%b") do (
        set "FILENAME=%%~nxf"
        set "EXTENSION=%%~xf"
        set "DIRNAME=%%~dpf"
    )
    
    REM Create commit message based on file extension
    if "!EXTENSION!"==".md" (
        set "COMMIT_MSG=docs: update !FILENAME!"
    ) else if "!EXTENSION!"==".jsx" (
        set "COMMIT_MSG=feat: update !FILENAME!"
    ) else if "!EXTENSION!"==".js" (
        set "COMMIT_MSG=feat: update !FILENAME!"
    ) else if "!EXTENSION!"==".css" (
        set "COMMIT_MSG=style: update !FILENAME!"
    ) else if "!EXTENSION!"==".sql" (
        set "COMMIT_MSG=db: update !FILENAME!"
    ) else if "!EXTENSION!"==".bat" (
        set "COMMIT_MSG=script: update !FILENAME!"
    ) else if "!EXTENSION!"==".sh" (
        set "COMMIT_MSG=script: update !FILENAME!"
    ) else if "!EXTENSION!"==".json" (
        set "COMMIT_MSG=config: update !FILENAME!"
    ) else (
        set "COMMIT_MSG=chore: update !FILENAME!"
    )
    
    REM Add and commit file
    git add "%%b" >nul 2>&1
    if !errorlevel! equ 0 (
        git commit -m "!COMMIT_MSG!" >nul 2>&1
        if !errorlevel! equ 0 (
            echo Berhasil commit: %%b
            set /a SUCCESS+=1
        ) else (
            echo Gagal commit: %%b
            set /a FAILED+=1
        )
    ) else (
        echo Gagal menambahkan file: %%b
        set /a FAILED+=1
    )
    
    echo.
)

REM Clean up
del temp_files.txt

echo ============================================
echo   RINGKASAN
echo ============================================
echo Total file     : %FILE_COUNT%
echo Berhasil       : %SUCCESS%
echo Gagal          : %FAILED%
echo ============================================
echo.

if %SUCCESS% gtr 0 (
    echo Tips:
    echo    - Untuk melihat commit: git log --oneline
    echo    - Untuk push ke remote: git push origin main
    echo.
)

echo Selesai!
pause
