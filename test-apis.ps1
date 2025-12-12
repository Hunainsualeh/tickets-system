# Test all multi-team APIs
Write-Host "`n===========================================================" -ForegroundColor Cyan
Write-Host "      TESTING MULTI-TEAM USER ACCESS APIS" -ForegroundColor Cyan
Write-Host "==========================================================`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:3000"
$token = $null

# Test 1: Login
Write-Host "[TEST 1] POST /api/auth/login" -ForegroundColor Yellow
$loginBody = @{
    username = "admin"
    password = "admin123"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body $loginBody -ContentType 'application/json'
    if ($response.success) {
        Write-Host "✅ Login successful!" -ForegroundColor Green
        $token = $response.token
        Write-Host "   User: $($response.user.username) (Role: $($response.user.role))" -ForegroundColor Gray
        if ($response.user.teams) {
            Write-Host "   Teams: $($response.user.teams.Count) team(s)" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: Get current user
Write-Host "`n[TEST 2] GET /api/auth/me" -ForegroundColor Yellow
try {
    $headers = @{Authorization = "Bearer $token"}
    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/me" -Headers $headers
    Write-Host "✅ Got current user!" -ForegroundColor Green
    Write-Host "   User: $($response.user.username)" -ForegroundColor Gray
    Write-Host "   Teams: $($response.user.teams.Count) team(s)" -ForegroundColor Gray
    if ($response.user.teams.Count -gt 0) {
        $response.user.teams | ForEach-Object {
            Write-Host "     - $($_.team.name)" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Get all users (multi-team info)
Write-Host "`n[TEST 3] GET /api/users" -ForegroundColor Yellow
try {
    $headers = @{Authorization = "Bearer $token"}
    $response = Invoke-RestMethod -Uri "$baseUrl/api/users" -Headers $headers
    Write-Host "✅ Got $($response.users.Count) users!" -ForegroundColor Green
    $multiTeamUsers = $response.users | Where-Object { $_.teams.Count -gt 1 }
    Write-Host "   Users with multiple teams: $($multiTeamUsers.Count)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Get tickets (filtered by user's teams)
Write-Host "`n[TEST 4] GET /api/tickets?scope=team" -ForegroundColor Yellow
try {
    $headers = @{Authorization = "Bearer $token"}
    $response = Invoke-RestMethod -Uri "$baseUrl/api/tickets?scope=team" -Headers $headers
    Write-Host "✅ Got $($response.tickets.Count) team tickets!" -ForegroundColor Green
    $ticketsWithTeams = $response.tickets | Where-Object { $_.team }
    Write-Host "   Tickets with team assignment: $($ticketsWithTeams.Count)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Get teams
Write-Host "`n[TEST 5] GET /api/teams" -ForegroundColor Yellow
try {
    $headers = @{Authorization = "Bearer $token"}
    $response = Invoke-RestMethod -Uri "$baseUrl/api/teams" -Headers $headers
    Write-Host "✅ Got $($response.teams.Count) teams!" -ForegroundColor Green
    $response.teams | ForEach-Object {
        Write-Host "   - $($_.name): $($_._count.users) member(s)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 6: Get requests (filtered by user's teams)
Write-Host "`n[TEST 6] GET /api/requests?scope=team" -ForegroundColor Yellow
try {
    $headers = @{Authorization = "Bearer $token"}
    $response = Invoke-RestMethod -Uri "$baseUrl/api/requests?scope=team" -Headers $headers
    Write-Host "✅ Got $($response.requests.Count) team requests!" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 7: Get notes (filtered by user's teams)
Write-Host "`n[TEST 7] GET /api/notes?scope=team" -ForegroundColor Yellow
try {
    $headers = @{Authorization = "Bearer $token"}
    $response = Invoke-RestMethod -Uri "$baseUrl/api/notes?scope=team" -Headers $headers
    Write-Host "✅ Got $($response.notes.Count) team notes!" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n===========================================================" -ForegroundColor Cyan
Write-Host "                  ALL TESTS COMPLETED!" -ForegroundColor Green
Write-Host "==========================================================`n" -ForegroundColor Cyan
