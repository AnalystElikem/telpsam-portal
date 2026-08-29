-- ==========================================================================
-- Migration 020: flag severity, so we can catch broadly WITHOUT pinging
-- coordinators for every low-confidence hint. High = alert; low = quiet
-- "for review" list. Manual reports / check-in concerns default to high.
-- Run in the SQL editor. Safe to re-run.
-- ==========================================================================
alter table public.reports
  add column if not exists severity text not null default 'high';
do $$
begin
  alter table public.reports
    add constraint reports_severity_check check (severity in ('high', 'low'));
exception when duplicate_object then null;
end $$;

create index if not exists reports_open_severity_idx on public.reports (status, severity);
