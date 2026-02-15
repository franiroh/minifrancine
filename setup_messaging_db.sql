-- Run this SQL in your Supabase SQL Editor to enable the messaging system

-- 1. Create conversations table
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  subject text,
  status text default 'open' check (status in ('open', 'closed'))
);

-- 2. Create messages table
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade not null,
  sender_id uuid references auth.users(id) not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  is_read boolean default false
);

-- 3. Enable RLS
alter table conversations enable row level security;
alter table messages enable row level security;

-- 4. Policies for conversations
create policy "Users can view their own conversations" 
  on conversations for select 
  using (auth.uid() = user_id);

create policy "Users can create their own conversations" 
  on conversations for insert 
  with check (auth.uid() = user_id);

-- Note: This assumes you handle admin check in frontend or rely on service role. 
-- Alternatively, add a policy for admin if you have a way to identify admins in 'profiles'.
create policy "Admins can view and update all conversations"
  on conversations for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- 5. Policies for messages
create policy "Users can view messages in their conversations"
  on messages for select
  using (
    exists (
      select 1 from conversations
      where conversations.id = messages.conversation_id
      and conversations.user_id = auth.uid()
    )
  );

create policy "Users can insert messages in their conversations"
  on messages for insert
  with check (
    exists (
      select 1 from conversations
      where conversations.id = messages.conversation_id
      and conversations.user_id = auth.uid()
    )
  );

create policy "Admins can view and send all messages"
  on messages for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );
