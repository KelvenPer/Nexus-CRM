Param(
  [string]$DatabaseUrl = $Env:DATABASE_URL,
  [string]$TenantAdmin = $(If ($Env:TENANT_ADMIN_SCHEMA) { $Env:TENANT_ADMIN_SCHEMA } Else { 'tenant_admin' })
)

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Env:PYTHONPATH = $Root
If (-not $DatabaseUrl -and -not $Env:SQLALCHEMY_DATABASE_URL) {
  Write-Error 'DATABASE_URL or SQLALCHEMY_DATABASE_URL is not set.'
  exit 1
}
$Env:TENANT_ADMIN_SCHEMA = $TenantAdmin
alembic -c "$Root\alembic.ini" upgrade head
