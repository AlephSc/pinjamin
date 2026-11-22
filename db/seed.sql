-- Safe, repeatable demo inventory. No user credentials or secrets.
insert into categories (name)
select category_name
from (values
  ('Fotografi'), ('Presentasi'), ('Audio'), ('Komputer'), ('Umum')
) as seed(category_name)
on conflict (name) do nothing;

update categories
set is_default = true
where name = 'Umum';

insert into tools (code, name, category_id, stock, available, condition)
select seed.code, seed.name, categories.id, seed.stock, seed.available, seed.condition
from (values
  ('T01', 'Kamera Canon EOS 250D', 'Fotografi', 6, 3, 'Baik'),
  ('T02', 'Proyektor Epson EB-X06', 'Presentasi', 8, 5, 'Baik'),
  ('T03', 'Tripod Takara A-125', 'Fotografi', 10, 9, 'Baik'),
  ('T04', 'Mikrofon Behringer XM8500', 'Audio', 12, 6, 'Baik'),
  ('T05', 'Speaker Aktif Yamaha DBR10', 'Audio', 4, 1, 'Perlu kalibrasi'),
  ('T06', 'Laptop Asus VivoBook 14', 'Komputer', 15, 11, 'Baik'),
  ('T07', 'Kabel HDMI 10m', 'Presentasi', 9, 4, 'Baik'),
  ('T08', 'Tenda Lipat 3x3', 'Umum', 3, 1, 'Baik')
) as seed(code, name, category_name, stock, available, condition)
join categories on categories.name = seed.category_name
on conflict (code) do nothing;
