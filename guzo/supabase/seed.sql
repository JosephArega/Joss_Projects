-- Demo seed data for ጉዞ (Guzo). Run after schema.sql.
insert into public.reports (type, lat, lng, note, neighborhood, device_key, created_at, expires_at)
values
  ('traffic',  9.0204, 38.8016, 'Standstill toward CMC, minibuses turning around', 'Megenagna',        'seed', now() - interval '6 minutes',  now() + interval '24 minutes'),
  ('police',   9.0009, 38.7902, 'Checking bolo and seatbelts',                     'Bole Medhanealem', 'seed', now() - interval '12 minutes', now() + interval '18 minutes'),
  ('accident', 9.0107, 38.7440, 'Two cars, right lane blocked near the roundabout','Mexico',           'seed', now() - interval '4 minutes',  now() + interval '26 minutes'),
  ('flood',    8.9960, 38.7400, 'Deep water after the rain, low cars avoid',       'Sarbet',           'seed', now() - interval '9 minutes',  now() + interval '21 minutes'),
  ('pothole',  9.0179, 38.8319, 'Big one in the middle lane',                      'CMC',              'seed', now() - interval '18 minutes', now() + interval '12 minutes'),
  ('blocked',  9.0345, 38.7500, 'Road works — one lane only',                      'Piassa',           'seed', now() - interval '15 minutes', now() + interval '15 minutes'),
  ('fuel',     8.9430, 38.7630, 'Long queue at Total Saris, ~40 cars',             'Saris',            'seed', now() - interval '22 minutes', now() + interval '8 minutes'),
  ('tip',      9.0350, 38.7390, 'Anbessa Gebeya side street is faster than the main road right now', 'Merkato', 'seed', now() - interval '3 minutes', now() + interval '27 minutes');

insert into public.tips (body, neighborhood, device_key, nickname, created_at)
values
  ('Bole road toward the airport is one-way after 6pm this week — use Gerji side.', 'Bole Medhanealem', 'seed', 'AbebeT',   now() - interval '45 minutes'),
  ('መገናኛ አካባቢ ከቀኑ 11 ሰዓት በኋላ በጣም ይጨናነቃል — በ ሲኤምሲ በኩል ይሂዱ።',                    'Megenagna',        'seed', 'ሾፌርX',    now() - interval '90 minutes'),
  ('Parking near Piassa Cathedral is full on Sundays before 9am.',                  'Piassa',           'seed', null,       now() - interval '150 minutes'),
  ('ቃሊቲ መውጫ ላይ የጭነት መኪኖች ወረፋ አለ — ጠዋት ከ1 ሰዓት በፊት ይለፉ።',                        'Kality',           'seed', 'TruckerB', now() - interval '200 minutes'),
  ('New speed bumps on the CMC–Summit road, unpainted and hard to see at night.',   'CMC',              'seed', null,       now() - interval '300 minutes');
