@echo off
cd /d "%~dp0"
node build-vernacularname-csv.js vernacularname.txt vernacularname.csv
if errorlevel 1 exit /b 1
echo.
echo Fichier genere : vernacularname.csv
