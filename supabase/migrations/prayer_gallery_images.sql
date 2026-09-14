-- Galeria de fundos do Modo Oração imersivo
create table if not exists prayer_gallery_images (
  id uuid primary key default gen_random_uuid(),
  created_date timestamptz default now(),
  updated_date timestamptz default now(),
  created_by_id uuid references auth.users(id),
  image_url text,
  label text,
  sort_order int default 0,
  is_active boolean default true
);

alter table prayer_gallery_images enable row level security;

-- Leitura pública (qualquer usuário autenticado ou anônimo pode ver fundos ativos)
drop policy if exists "pgi_read" on prayer_gallery_images;
create policy "pgi_read" on prayer_gallery_images
  for select using (true);

-- Escrita restrita a admin
drop policy if exists "pgi_admin_write" on prayer_gallery_images;
create policy "pgi_admin_write" on prayer_gallery_images
  for all
  using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );