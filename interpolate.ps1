# BASH to PowerShell Translation
# This script generates 'Library.js' from a template and module files.

$ErrorActionPreference = 'Stop'
$templatePath = './Library_template.js'
$insertionPoint = 'YOUR MODULES AUTOMATICALLY IMPORTED HERE'
$outputFile = '.\Library.js'

# Get the content of the template file.
$templateContent = Get-Content -Path $templatePath

# Find the line number of the insertion point.
$insertionIndex = $templateContent | Select-String -Pattern $insertionPoint -SimpleMatch | Select-Object -ExpandProperty LineNumber

echo $insertionIndex

exit 0

# Separate the content into three parts: before the insertion point, the modules, and after the insertion point.
$beforeInsertion = $templateContent[0..($insertionIndex - 2)]
$afterInsertion = $templateContent[$insertionIndex..($templateContent.Count - 1)]

# Get the main body of the library (everything before the insertion point).
$beforeInsertion | Out-File -FilePath $outputFile -Encoding utf8

# Import all modules.
Get-ChildItem -Path './modules/' -Directory | ForEach-Object {
    $moduleName = $_.Name
    $targetPath = $_.FullName

    # Using a Here-String for the module content.
    $heredoc = @"
makeMod((() => {
    // Module: $moduleName
    // Initially: $(if (Test-Path -Path "$targetPath\Initially.js") { Get-Content -Path "$targetPath\Initially.js" | Out-String } else { 'true' })
    // Preload
$(if (Test-Path -Path "$targetPath\Preload.js") { Get-Content -Path "$targetPath\Preload.js" | Out-String })
    // Library
$(if (Test-Path -Path "$targetPath\Library.js") { Get-Content -Path "$targetPath\Library.js" | Out-String })
    // Input
$(if (Test-Path -Path "$targetPath\Input.js") { Get-Content -Path "$targetPath\Input.js" | Out-String })
    // Context
$(if (Test-Path -Path "$targetPath\Context.js") { Get-Content -Path "$targetPath\Context.js" | Out-String })
    // Output
$(if (Test-Path -Path "$targetPath\Output.js") { Get-Content -Path "$targetPath\Output.js" | Out-String })
    // End
}).toString())
"@

    # Append the module content to the output file.
    $heredoc | Out-File -FilePath $outputFile -Append -Encoding utf8
}

# Output anything after the insertion point.
$afterInsertion | Out-File -FilePath $outputFile -Append -Encoding utf8
