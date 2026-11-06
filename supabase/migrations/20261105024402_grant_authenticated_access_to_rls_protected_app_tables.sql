
grant select, insert, update, delete on table
  public.clients, public.cases, public.calendar_events,
  public.deadlines, public.documents, public.legal_library
to authenticated;

grant select, delete on table public.firm_invitations to authenticated;
