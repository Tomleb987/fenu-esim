SELECT setval(
  pg_get_serial_sequence('promo_codes', 'id'), 
  (SELECT MAX(id) FROM promo_codes)
);

-- Now insert
INSERT INTO public.promo_codes (
  code, 
  discount_percentage, 
  discount_amount, 
  is_active, 
  valid_from, 
  valid_until, 
  usage_limit, 
  times_used
)
VALUES (
  'ANSET5',
  5,
  NULL,
  true,
  '2024-01-01',
  '2027-12-31',
  10000,
  0
)
ON CONFLICT (code) DO NOTHING;