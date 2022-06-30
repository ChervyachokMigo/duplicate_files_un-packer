@echo off
SET input=%~1
IF "%input%"=="" echo no package file. retry && pause && exit
echo set package file %input%
set /P output="destination path(unpack): " || SET "output=unpack"
cd /D "%~dp0"
DuplicateArchivator_cli.bat --unpack -i "%input%" -o "%output%"
pause