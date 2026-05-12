create table if not exists accounts (
  id bigint unsigned not null auto_increment,
  username varchar(64) not null,
  display_name varchar(128) not null,
  password_hash varchar(255) not null,
  role enum('super_admin', 'admin', 'host') not null default 'host',
  status enum('active', 'disabled', 'locked') not null default 'active',
  max_devices int not null default 1,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp,
  deleted_at timestamp null,
  primary key (id),
  unique key uk_accounts_username (username),
  key idx_accounts_role_status (role, status)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists devices (
  id bigint unsigned not null auto_increment,
  account_id bigint unsigned not null,
  device_uid varchar(128) not null,
  platform enum('ios', 'android', 'web', 'unknown') not null default 'unknown',
  device_name varchar(128) not null default '',
  app_version varchar(64) not null default '',
  status enum('bound', 'unbound', 'blocked') not null default 'bound',
  bound_at timestamp null,
  unbound_at timestamp null,
  last_seen_at timestamp null,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp,
  primary key (id),
  unique key uk_devices_account_uid (account_id, device_uid),
  key idx_devices_account_status (account_id, status),
  constraint fk_devices_account foreign key (account_id) references accounts(id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists meetings (
  id bigint unsigned not null auto_increment,
  meeting_number varchar(12) not null,
  room_name varchar(128) not null,
  host_account_id bigint unsigned not null,
  preferred_region enum('hk', 'sg', 'cn') not null default 'hk',
  livekit_url varchar(255) not null,
  status enum('created', 'active', 'ended', 'expired') not null default 'created',
  created_at timestamp not null default current_timestamp,
  ended_at timestamp null,
  primary key (id),
  unique key uk_meetings_number (meeting_number),
  unique key uk_meetings_room (room_name),
  key idx_meetings_host_created (host_account_id, created_at),
  key idx_meetings_status_region (status, preferred_region),
  constraint fk_meetings_host foreign key (host_account_id) references accounts(id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists livekit_nodes (
  id bigint unsigned not null auto_increment,
  region enum('hk', 'sg', 'cn') not null,
  name varchar(128) not null,
  signal_url varchar(255) not null,
  status enum('healthy', 'degraded', 'offline', 'draining') not null default 'offline',
  last_health_at timestamp null,
  load_score decimal(6, 4) null,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp,
  primary key (id),
  unique key uk_livekit_nodes_name (name),
  key idx_livekit_nodes_region_status (region, status)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists audit_logs (
  id bigint unsigned not null auto_increment,
  actor_account_id bigint unsigned null,
  action varchar(64) not null,
  target_type varchar(64) not null,
  target_id varchar(64) not null,
  ip_address varchar(64) not null default '',
  user_agent varchar(255) not null default '',
  detail_json json null,
  created_at timestamp not null default current_timestamp,
  primary key (id),
  key idx_audit_actor_created (actor_account_id, created_at),
  key idx_audit_target_created (target_type, target_id, created_at)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;
