create or replace function public.claim_studio()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_id uuid;
  admin_count integer;
  already_admin boolean;
begin
  current_id := auth.uid();
  if current_id is null then
    return false;
  end if;

  select coalesce(raw_app_meta_data ->> 'role', '') = 'admin'
  into already_admin
  from auth.users
  where id = current_id;

  if already_admin then
    return true;
  end if;

  select count(*)::integer
  into admin_count
  from auth.users
  where raw_app_meta_data ->> 'role' = 'admin';

  if admin_count > 0 then
    return false;
  end if;

  update auth.users
  set raw_app_meta_data =
    coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
  where id = current_id;

  return found;
end;
$$;

revoke all on function public.claim_studio() from public, anon;
grant execute on function public.claim_studio() to authenticated;
