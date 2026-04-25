insert into storage.buckets (id, name, public) values ('tutorials', 'tutorials', true) on conflict (id) do nothing;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Tutorials public read') then
    create policy "Tutorials public read" on storage.objects for select using (bucket_id = 'tutorials');
  end if;
end $$;