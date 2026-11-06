
revoke execute on all functions in schema private from public,anon,authenticated;

grant execute on function private.is_firm_member(uuid) to authenticated;
grant execute on function private.has_firm_role(uuid,text[]) to authenticated;
grant execute on function private.current_user_email() to authenticated;
grant execute on function private.has_case_access(uuid,uuid,text) to authenticated;
grant execute on function private.has_finance_access(uuid,uuid,text) to authenticated;
grant execute on function private.has_payment_access(uuid,uuid,text) to authenticated;
grant execute on function private.create_firm_invitation(uuid,text,text,text) to authenticated;
grant execute on function private.accept_firm_invitation(text) to authenticated;
grant execute on function private.list_firm_directory(uuid) to authenticated;
