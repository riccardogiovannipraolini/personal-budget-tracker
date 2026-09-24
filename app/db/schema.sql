-- Budget Tracker — schema dati (Postgres / Supabase)
-- Rispecchia il modello dati §3.3 del documento di progetto.

-- Categorie personali con soglia mensile
create table if not exists category (
  id                bigint generated always as identity primary key,
  name              text not null unique,
  monthly_threshold numeric(12, 2) not null default 0,
  icon              text not null default 'tag',
  created_at        timestamptz not null default now()
);
-- Aggiunta retro-compatibile per DB già esistenti.
alter table category add column if not exists icon text not null default 'tag';

-- Mappatura categoria grezza (es. categoria Tink) -> categoria personale.
-- Permette di rimappare senza toccare il codice (§ Manutenibilità).
create table if not exists category_mapping (
  raw_category text primary key,
  category_id  bigint not null references category(id) on delete cascade
);

-- Transazioni importate
create table if not exists transaction (
  id           bigint generated always as identity primary key,
  external_id  text not null unique,                -- id stabile dalla sorgente -> deduplica
  booked_at    date not null,
  amount       numeric(12, 2) not null,             -- negativo = uscita, positivo = entrata
  merchant     text,
  description  text,
  raw_category text,                                -- categoria originale dalla sorgente (Tink)
  category_id  bigint references category(id) on delete set null,
  excluded     boolean not null default false,      -- esclusa dai conteggi (es. spesa rimborsata)
  created_at   timestamptz not null default now()
);

create index if not exists idx_transaction_booked_at on transaction (booked_at);
create index if not exists idx_transaction_category on transaction (category_id);
-- Aggiunta retro-compatibile per DB già esistenti.
alter table transaction add column if not exists excluded boolean not null default false;

-- Aggregato speso/soglia per categoria e periodo (mese, formato 'YYYY-MM').
-- Materializzato per letture veloci della dashboard; ricalcolato a ogni run.
create table if not exists budget_period (
  id          bigint generated always as identity primary key,
  category_id bigint not null references category(id) on delete cascade,
  period      text not null,                        -- 'YYYY-MM'
  spent       numeric(12, 2) not null default 0,
  threshold   numeric(12, 2) not null default 0,
  unique (category_id, period)
);

-- Regole di categorizzazione "imparate": esercente normalizzato -> categoria.
-- source='manual' = insegnata dall'utente (ha priorità sulle regole automatiche).
create table if not exists merchant_rule (
  merchant_key text primary key,
  category_id  bigint not null references category(id) on delete cascade,
  source       text not null default 'manual',
  updated_at   timestamptz not null default now()
);

-- Stato della sincronizzazione con la sorgente
create table if not exists sync_state (
  id               int primary key default 1,
  last_sync        timestamptz,
  last_external_id text,
  constraint sync_state_singleton check (id = 1)
);

insert into sync_state (id) values (1) on conflict (id) do nothing;
-- Aggiunta retro-compatibile: pausa stimata per rate limit.
alter table sync_state add column if not exists rate_limited_until timestamptz;
