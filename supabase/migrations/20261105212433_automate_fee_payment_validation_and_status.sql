
create index if not exists fee_entries_firm_case_idx
on public.fee_entries (firm_id,case_id);

create index if not exists fee_entries_created_by_idx
on public.fee_entries (created_by);

create index if not exists payments_received_by_idx
on public.payments (received_by);

create or replace function private.validate_fee_payment()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_fee_amount numeric(14,2);
  v_already_paid numeric(14,2);
begin
  if tg_op = 'UPDATE' and
     (new.firm_id <> old.firm_id or new.fee_entry_id <> old.fee_entry_id) then
    raise exception 'No se puede cambiar el estudio o el honorario asociado a un pago';
  end if;

  select amount
  into v_fee_amount
  from public.fee_entries
  where id = new.fee_entry_id and firm_id = new.firm_id
  for update;

  if not found then
    raise exception 'El honorario asociado no existe en este estudio';
  end if;

  select coalesce(sum(amount), 0)
  into v_already_paid
  from public.payments
  where firm_id = new.firm_id
    and fee_entry_id = new.fee_entry_id
    and (tg_op <> 'UPDATE' or id <> old.id);

  if v_already_paid + new.amount > v_fee_amount then
    raise exception 'El pago supera el saldo pendiente del honorario';
  end if;

  return new;
end;
$$;

create or replace function private.sync_fee_entry_status()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_firm_id uuid;
  v_fee_entry_id uuid;
  v_paid numeric(14,2);
begin
  if tg_op = 'DELETE' then
    v_firm_id := old.firm_id;
    v_fee_entry_id := old.fee_entry_id;
  else
    v_firm_id := new.firm_id;
    v_fee_entry_id := new.fee_entry_id;
  end if;

  select coalesce(sum(amount), 0)
  into v_paid
  from public.payments
  where firm_id = v_firm_id and fee_entry_id = v_fee_entry_id;

  update public.fee_entries
  set status = case
    when status = 'cancelled' then 'cancelled'
    when v_paid >= amount then 'paid'
    when v_paid > 0 then 'partial'
    else 'pending'
  end
  where firm_id = v_firm_id and id = v_fee_entry_id;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists payments_validate_before_write on public.payments;
create trigger payments_validate_before_write
before insert or update on public.payments
for each row execute function private.validate_fee_payment();

drop trigger if exists payments_sync_fee_status on public.payments;
create trigger payments_sync_fee_status
after insert or update or delete on public.payments
for each row execute function private.sync_fee_entry_status();
