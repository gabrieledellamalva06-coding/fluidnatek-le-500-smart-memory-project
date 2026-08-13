$ErrorActionPreference = "Stop"
$projectRoot = $PSScriptRoot
$src = Join-Path $projectRoot "src"

Copy-Item (Join-Path $PSScriptRoot "RunConfig.tsx") (Join-Path $src "components\RunConfig.tsx") -Force

$appPath = Join-Path $src "App.tsx"
$app = Get-Content $appPath -Raw

if ($app -notmatch "const handleAddSetup") {
  $anchor = "  const handleAddExperiment = async ("
  $handler = @'
  const handleAddSetup = async (
    input: CreateSetupInput
  ): Promise<void> => {
    setDataError(null);
    try {
      const createdSetup = await setupService.createSetup(input);
      setSetups((previous) => [createdSetup, ...previous]);
    } catch (error: unknown) {
      const message = `Impossibile creare il setup: ${getErrorMessage(error)}`;
      setDataError(message);
      throw new Error(message);
    }
  };


'@
  $app = $app.Replace($anchor, $handler + $anchor)
}

$app = $app.Replace(
'        case "SETUPS":
          return <SetupsWorkspace />;',
'        case "SETUPS":
          return (
            <Setups
              projects={projects}
              setups={setups}
              onAddSetup={handleAddSetup}
            />
          );'
)

$app = $app.Replace(
'              experiments={experiments}
              onAddExperiment={',
'              characterizations={characterizations}
              setups={setups}
              experiments={experiments}
              onAddExperiment={'
)

$app = [regex]::Replace($app, '(?s)\r?\nfunction SetupsWorkspace\(\) \{.*?\r?\n\}\s*$', "`r`n")
$app = $app.Replace("  Plus,`r`n  SlidersHorizontal,", "  Plus,")
Set-Content $appPath $app -Encoding UTF8

$servicePath = Join-Path $src "application\experiments\experiment.service.ts"
$service = Get-Content $servicePath -Raw
$service = $service.Replace("input.jetStabilityGrade > 5", "input.jetStabilityGrade > 4")
$service = $service.Replace('"Jet stability grade must be between 1 and 5."', '"Processability grade must be between 1 and 4."')
Set-Content $servicePath $service -Encoding UTF8

$dashboardPath = Join-Path $src "components\Dashboard.tsx"
$dashboard = Get-Content $dashboardPath -Raw
$dashboard = $dashboard.Replace('import { AIOptimizationWidget } from "./AIOptimizationWidget";' + "`r`n", "")
$dashboard = $dashboard.Replace('import { AIInsights } from "./AIInsights";' + "`r`n", "")
$dashboard = [regex]::Replace($dashboard, '(?s)\s*<div className="mt-6 space-y-6">\s*<AIOptimizationWidget.*?</div>\s*</div>', "`r`n              </div>")
$dashboard = $dashboard.Replace('<option value="5" className="bg-[#18181b] text-white">5 - {lang === "it" ? "Perfetto" : lang === "es" ? "Perfecto" : "Perfect"}</option>' + "`r`n", "")
$dashboard = $dashboard.Replace("[1, 2, 3, 4, 5].map((s)", "[1, 2, 3, 4].map((s)")
$dashboard = $dashboard.Replace("{selectedExp.jetStabilityGrade}/5", "{selectedExp.jetStabilityGrade}/4")
$dashboard = $dashboard.Replace("{exp.jetStabilityGrade}/5", "{exp.jetStabilityGrade}/4")
Set-Content $dashboardPath $dashboard -Encoding UTF8

Push-Location $projectRoot
try {
  npm run lint
  if ($LASTEXITCODE -ne 0) { throw "Lint failed." }
  npm run build
  if ($LASTEXITCODE -ne 0) { throw "Build failed." }
}
finally { Pop-Location }

Write-Host "DONE: workflow applied, Co-Pilot removed, processability 1-4." -ForegroundColor Green
