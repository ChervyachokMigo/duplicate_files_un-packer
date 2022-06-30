@echo off
set /P input="source path: " || echo no source. retry && pause && exit
set /P output="archive name(archive): " || SET "output=archive"
DuplicateArchivator_cli.bat --pack -i "%input%" -o "%output%"