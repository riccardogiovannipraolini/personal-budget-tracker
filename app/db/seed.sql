-- Categorie + budget mensili d'esempio (allineati a src/seedData.ts).
insert into category (name, monthly_threshold, icon) values
  ('Software & AI (abbonamenti)',           50, 'chip'),
  ('Ristoranti, bar & caffè',              150, 'cup'),
  ('Carburante',                           100, 'fuel'),
  ('Spesa / Supermercato',                 250, 'cart'),
  ('Trasporti (pedaggi/parcheggi/mezzi)',   60, 'bus'),
  ('Intrattenimento & Gaming',              40, 'game'),
  ('Palestra & Integratori',                40, 'dumbbell'),
  ('Food delivery',                         30, 'package'),
  ('Auto (manutenzione)',                   50, 'car'),
  ('Abbigliamento & Shopping',              60, 'bag'),
  ('Tasse & Servizi pubblici',              20, 'receipt'),
  ('Cura personale',                        30, 'scissors'),
  ('Altro / Vario',                         50, 'tag')
on conflict (name) do nothing;

-- Mappatura raw_category (output di guessRawCategory) -> categoria personale.
insert into category_mapping (raw_category, category_id)
select m.raw_category, c.id
from (values
  ('software',        'Software & AI (abbonamenti)'),
  ('ristoranti',      'Ristoranti, bar & caffè'),
  ('carburante',      'Carburante'),
  ('spesa',           'Spesa / Supermercato'),
  ('trasporti',       'Trasporti (pedaggi/parcheggi/mezzi)'),
  ('intrattenimento', 'Intrattenimento & Gaming'),
  ('palestra',        'Palestra & Integratori'),
  ('delivery',        'Food delivery'),
  ('auto',            'Auto (manutenzione)'),
  ('abbigliamento',   'Abbigliamento & Shopping'),
  ('tasse',           'Tasse & Servizi pubblici'),
  ('cura',            'Cura personale'),
  ('altro',           'Altro / Vario')
) as m(raw_category, cat_name)
join category c on c.name = m.cat_name
on conflict (raw_category) do nothing;
