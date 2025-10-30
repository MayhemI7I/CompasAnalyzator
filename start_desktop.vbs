Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")

' Получаем путь к папке скрипта
ScriptDir = FSO.GetParentFolderName(WScript.ScriptFullName)

' Запускаем сервер скрыто
WshShell.Run """" & ScriptDir & "\compass_analyzer.exe"" web", 0, False

' Ждем 2 секунды для запуска сервера
WScript.Sleep 2000

' Открываем браузер
WshShell.Run "http://localhost:8080"

Set FSO = Nothing
Set WshShell = Nothing

