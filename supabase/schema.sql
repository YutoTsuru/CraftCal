-- ============================================================================
-- CraftCal DB スキーマ (Issue #33)
-- Supabase の SQL Editor に貼り付けて一度で実行できる。
-- 冪等性のため create or replace / if not exists / drop policy if exists を使用。
-- 方針:
--   - 各ユーザーは自分のデータ (auth.uid() = user_id) だけを CRUD 可能 (RLS)
--   - Inbox は tasks.project_id IS NULL で表現し、projects テーブルには行を作らない
--   - updated_at は共通トリガーで自動更新
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 共通: updated_at を行更新時に自動で現在時刻へ更新するトリガー関数
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- profiles: auth.users と 1:1 のプロフィール情報
-- id は auth.users.id をそのまま主キー兼 FK にする
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- projects: ユーザーのプロジェクト
-- ----------------------------------------------------------------------------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'active',
  goal text,
  color text,
  overview_url text,
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_status_check check (status in ('active', 'paused', 'done')),
  constraint projects_name_len_check check (char_length(name) between 1 and 200),
  constraint projects_description_len_check check (description is null or char_length(description) <= 2000)
);

-- ----------------------------------------------------------------------------
-- tasks: ユーザーのタスク
-- project_id は削除時 SET NULL（プロジェクトを消してもタスクは Inbox に残す現行仕様）
-- ----------------------------------------------------------------------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  title text not null,
  description text,
  status text not null default 'todo',
  priority text not null default 'medium',
  weight text not null default 'medium',
  due_date date,
  scheduled_date date,
  estimated_minutes integer,
  completed_at timestamptz,
  completion_note text,
  completion_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_status_check check (status in ('todo', 'doing', 'done', 'expired', 'paused', 'cancelled')),
  constraint tasks_priority_check check (priority in ('low', 'medium', 'high')),
  constraint tasks_weight_check check (weight in ('light', 'medium', 'heavy')),
  constraint tasks_estimated_minutes_check check (estimated_minutes is null or estimated_minutes >= 0),
  constraint tasks_title_len_check check (char_length(title) between 1 and 200),
  constraint tasks_description_len_check check (description is null or char_length(description) <= 2000)
);

-- ----------------------------------------------------------------------------
-- schedules: 予定（現状 UI からは未使用。将来のスケジュール機能用に spec どおり作成）
-- ----------------------------------------------------------------------------
create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id uuid references public.tasks (id) on delete cascade,
  title text not null,
  start_at timestamptz,
  end_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedules_title_len_check check (char_length(title) between 1 and 200),
  constraint schedules_time_order_check check (end_at is null or start_at is null or end_at > start_at)
);

-- ----------------------------------------------------------------------------
-- tasks: 予定の開始/終了時刻 (Issue #51)
-- Googleカレンダー片方向連携の前提として、日付のみだった予定に任意の時刻を持たせる。
-- 既存データには影響しないよう、列は nullable・default なしで追加するだけ（バックフィルしない）。
-- add column if not exists / drop constraint if exists で何度実行しても安全（冪等）。
-- ----------------------------------------------------------------------------
alter table public.tasks add column if not exists scheduled_start_time text;
alter table public.tasks add column if not exists scheduled_end_time text;

alter table public.tasks drop constraint if exists tasks_scheduled_start_time_check;
alter table public.tasks add constraint tasks_scheduled_start_time_check
  check (scheduled_start_time is null or scheduled_start_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');

alter table public.tasks drop constraint if exists tasks_scheduled_end_time_check;
alter table public.tasks add constraint tasks_scheduled_end_time_check
  check (scheduled_end_time is null or scheduled_end_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');

-- ----------------------------------------------------------------------------
-- インデックス: 絞り込みに使う列に付与
-- ----------------------------------------------------------------------------
create index if not exists projects_user_id_idx on public.projects (user_id);
create index if not exists tasks_user_id_idx on public.tasks (user_id);
create index if not exists tasks_project_id_idx on public.tasks (project_id);
create index if not exists tasks_scheduled_date_idx on public.tasks (scheduled_date);
create index if not exists tasks_due_date_idx on public.tasks (due_date);
create index if not exists schedules_user_id_idx on public.schedules (user_id);
create index if not exists schedules_task_id_idx on public.schedules (task_id);

-- ----------------------------------------------------------------------------
-- updated_at 自動更新トリガー（各テーブルに設定）
-- ----------------------------------------------------------------------------
drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.projects;
create trigger set_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.tasks;
create trigger set_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.schedules;
create trigger set_updated_at before update on public.schedules
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- signup 時に profiles 行を自動作成するトリガー
-- auth.users への insert をフックして同じ id で profiles を作る
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- RLS 有効化
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.schedules enable row level security;

-- ----------------------------------------------------------------------------
-- ポリシー: profiles（自分の行 = auth.uid() = id のみ）
-- ----------------------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (auth.uid() = id);

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles
  for delete using (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- ポリシー: projects（自分の行 = auth.uid() = user_id のみ）
-- ----------------------------------------------------------------------------
drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects
  for select using (auth.uid() = user_id);

drop policy if exists projects_insert on public.projects;
create policy projects_insert on public.projects
  for insert with check (auth.uid() = user_id);

drop policy if exists projects_update on public.projects;
create policy projects_update on public.projects
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists projects_delete on public.projects;
create policy projects_delete on public.projects
  for delete using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- ポリシー: tasks（自分の行 = auth.uid() = user_id のみ）
-- ----------------------------------------------------------------------------
drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks
  for select using (auth.uid() = user_id);

drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert on public.tasks
  for insert with check (auth.uid() = user_id);

drop policy if exists tasks_update on public.tasks;
create policy tasks_update on public.tasks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists tasks_delete on public.tasks;
create policy tasks_delete on public.tasks
  for delete using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- ポリシー: schedules（自分の行 = auth.uid() = user_id のみ）
-- ----------------------------------------------------------------------------
drop policy if exists schedules_select on public.schedules;
create policy schedules_select on public.schedules
  for select using (auth.uid() = user_id);

drop policy if exists schedules_insert on public.schedules;
create policy schedules_insert on public.schedules
  for insert with check (auth.uid() = user_id);

drop policy if exists schedules_update on public.schedules;
create policy schedules_update on public.schedules
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists schedules_delete on public.schedules;
create policy schedules_delete on public.schedules
  for delete using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- プロジェクトのアイコン画像 (Issue #82)
--
-- 画像は Supabase Storage に置き、projects には保存先のパスだけを持たせる。
-- パスは "{user_id}/{project_id}" 形式にして、ポリシーで先頭フォルダが
-- ログイン中のユーザーIDと一致する場合のみ書き込み・削除を許可する。
--
-- バケットを public にしている点について:
--   読み取りを public にすると、表示側は URL を組み立てるだけで済む
--   （署名URLの取得が不要になり、一覧の描画を同期的に書ける）。
--   代償として URL を知っていれば誰でも画像を取得できるが、パスは
--   user_id と project_id の uuid で構成されるため推測はほぼ不可能。
--   アイコンは装飾であり秘密ではない、という前提の機能として割り切っている。
--   機密性が必要になったら public を false にし、署名URL方式へ切り替えること。
--
-- add column if not exists / on conflict do nothing / drop policy if exists で
-- 何度実行しても安全（冪等）。
-- ----------------------------------------------------------------------------
alter table public.projects add column if not exists icon_path text;

insert into storage.buckets (id, name, public)
values ('project-icons', 'project-icons', true)
on conflict (id) do nothing;

-- 読み取りは誰でも（public バケットのため）
drop policy if exists project_icons_select on storage.objects;
create policy project_icons_select on storage.objects
  for select using (bucket_id = 'project-icons');

-- 書き込み・更新・削除は「自分のユーザーIDのフォルダ配下」のみ。
-- storage.foldername(name) は パスをフォルダ名の配列に分解する（1要素目が先頭フォルダ）。
drop policy if exists project_icons_insert on storage.objects;
create policy project_icons_insert on storage.objects
  for insert with check (
    bucket_id = 'project-icons'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists project_icons_update on storage.objects;
create policy project_icons_update on storage.objects
  for update using (
    bucket_id = 'project-icons'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists project_icons_delete on storage.objects;
create policy project_icons_delete on storage.objects
  for delete using (
    bucket_id = 'project-icons'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
