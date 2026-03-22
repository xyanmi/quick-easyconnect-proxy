@echo off
REM Build script for Quick EasyConnect Proxy
REM This script runs cargo build in the Visual Studio environment

echo Building Quick EasyConnect Proxy...

REM Try to find and setup VS environment
if exist "C:\Program Files\Microsoft Visual Studio\2022\Community\Common7\Tools\VsDevCmd.bat" (
    call "C:\Program Files\Microsoft Visual Studio\2022\Community\Common7\Tools\VsDevCmd.bat"
) else if exist "C:\Program Files\Microsoft Visual Studio\2022\Professional\Common7\Tools\VsDevCmd.bat" (
    call "C:\Program Files\Microsoft Visual Studio\2022\Professional\Common7\Tools\VsDevCmd.bat"
) else if exist "C:\Program Files\Microsoft Visual Studio\2022\Enterprise\Common7\Tools\VsDevCmd.bat" (
    call "C:\Program Files\Microsoft Visual Studio\2022\Enterprise\Common7\Tools\VsDevCmd.bat"
) else if exist "C:\Program Files\Microsoft Visual Studio\2022\BuildTools\Common7\Tools\VsDevCmd.bat" (
    call "C:\Program Files\Microsoft Visual Studio\2022\BuildTools\Common7\Tools\VsDevCmd.bat"
) else (
    echo ERROR: Visual Studio 2022 not found!
    echo Please install Visual Studio Build Tools from:
    echo https://visualstudio.microsoft.com/visual-cpp-build-tools/
    echo.
    echo Make sure to select "Desktop development with C++" workload.
    pause
    exit /b 1
)

REM Switch to MSVC toolchain
rustup default stable-x86_64-pc-windows-msvc

REM Build the project
cd /d "%~dp0src-tauri"
cargo build --release

echo.
echo Build complete!
pause
