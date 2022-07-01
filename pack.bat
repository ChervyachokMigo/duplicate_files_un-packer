@echo off
SET input=%~1
IF "%input%"=="" echo no source pack path. set it && set /P input="source path: " || echo no source. retry && pause && exit
echo set pack folder %input%
set /P output="archive name(archive): " || SET "output=archive"
cd /D "%~dp0"
DuplicateArchivator_cli.bat --pack -i "%input%" -o "%output%"
pause