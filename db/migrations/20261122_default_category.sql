-- Kategori Umum wajib tersedia sebagai tempat alat saat kategori dihapus.
alter table categories add column if not exists is_default boolean not null default false;

-- Pastikan nama Umum selalu ada dan diberi marker proteksi.
insert into categories (name, is_default)
values ('Umum', true)
on conflict (name) do update set is_default = true;

-- Cegah lebih dari satu kategori default.
create unique index if not exists categories_single_default_idx
on categories (is_default)
where is_default;
