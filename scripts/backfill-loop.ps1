# Throwaway: drive the monitor backfill until the backlog drains. Delete after.
$secret = $env:MCDOT_CRON_SECRET
$h = @{ Authorization = "Bearer $secret" }
$log = "C:\Users\Nitropc\Veritor_Group\MCDOT\scripts\backfill-log.txt"
"START $(Get-Date -Format o)" | Out-File -FilePath $log -Encoding utf8
$zeroStreak = 0
for ($i = 1; $i -le 30; $i++) {
  try {
    $r = Invoke-RestMethod -Uri "https://groupveritor.com/api/cron/process-followups?backfill=1" -Headers $h -TimeoutSec 290
    $m = $r.monitor
    $line = "run=$i verified=$($m.verified) enriched=$($m.enriched) note=$($m.note)"
    Add-Content -Path $log -Value $line -Encoding utf8
    if (($m.verified -eq 0) -and ($m.enriched -eq 0)) { $zeroStreak++ } else { $zeroStreak = 0 }
    if ($zeroStreak -ge 2) { Add-Content -Path $log -Value "DRAINED after $i runs" -Encoding utf8; break }
  } catch {
    Add-Content -Path $log -Value "run=$i ERROR $($_.Exception.Message)" -Encoding utf8
    Start-Sleep -Seconds 30
  }
  Start-Sleep -Seconds 5
}
"END $(Get-Date -Format o)" | Add-Content -Path $log -Encoding utf8
