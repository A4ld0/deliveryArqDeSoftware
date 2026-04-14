-- Fix previously seeded data where every restaurant got the same menu.
-- It removes old generic demo dish names and inserts differentiated menus per restaurant.

WITH old_seed_names AS (
  SELECT *
  FROM (
    VALUES
      ('Sushi empanizado camaron'),
      ('Taco de arrachera'),
      ('Pizza pepperoni mediana'),
      ('Hamburguesa doble'),
      ('Pad thai pollo'),
      ('Bowl mediterraneo')
  ) AS t(name)
)
DELETE FROM products p
USING old_seed_names s
WHERE lower(p.name) = lower(s.name);

WITH menu_items AS (
  SELECT *
  FROM (
    VALUES
      (
        'Sushi N Go',
        'Rollo filadelfia',
        'Salmon, queso crema, aguacate y ajonjoli.',
        189.00::numeric,
        'Sushi',
        'https://images.unsplash.com/photo-1611143669185-af224c5e3252?auto=format&fit=crop&w=900&q=80'
      ),
      (
        'Sushi N Go',
        'Gohan especial',
        'Arroz al vapor, proteina a elegir y toppings.',
        165.00::numeric,
        'Bowls',
        'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=900&q=80'
      ),
      (
        'Sushi N Go',
        'Ramen tonkotsu',
        'Caldo cremoso, noodles, cerdo y huevo marinado.',
        210.00::numeric,
        'Ramen',
        'https://images.unsplash.com/photo-1557872943-16a5ac26437e?auto=format&fit=crop&w=900&q=80'
      ),
      (
        'Tacos Norte 24',
        'Taco de arrachera',
        'Tortilla de maiz con arrachera, cebolla y cilantro.',
        49.00::numeric,
        'Tacos',
        'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?auto=format&fit=crop&w=900&q=80'
      ),
      (
        'Tacos Norte 24',
        'Burrito norte',
        'Tortilla de harina, carne asada, frijol y queso.',
        118.00::numeric,
        'Burritos',
        'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=900&q=80'
      ),
      (
        'Tacos Norte 24',
        'Quesadilla campechana',
        'Mezcla de pastor y bistec con queso gratinado.',
        92.00::numeric,
        'Quesadillas',
        'https://images.unsplash.com/photo-1613514785940-daed07799d9b?auto=format&fit=crop&w=900&q=80'
      ),
      (
        'Pizza Ferro',
        'Pizza pepperoni mediana',
        'Masa artesanal, salsa pomodoro y pepperoni.',
        199.00::numeric,
        'Pizza',
        'https://images.unsplash.com/photo-1548365328-9f547fb0953f?auto=format&fit=crop&w=900&q=80'
      ),
      (
        'Pizza Ferro',
        'Pizza cuatro quesos',
        'Mozzarella, gorgonzola, parmesano y provolone.',
        219.00::numeric,
        'Pizza',
        'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=900&q=80'
      ),
      (
        'Pizza Ferro',
        'Lasagna boloñesa',
        'Pasta al horno con salsa de carne y queso.',
        186.00::numeric,
        'Pasta',
        'https://images.unsplash.com/photo-1612874742237-6526221588e3?auto=format&fit=crop&w=900&q=80'
      ),
      (
        'Burgers Foundry',
        'Hamburguesa doble',
        'Doble carne smash, queso cheddar y pepinillos.',
        175.00::numeric,
        'Burgers',
        'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80'
      ),
      (
        'Burgers Foundry',
        'Papas trufa parmesano',
        'Papas a la francesa con aceite de trufa y parmesano.',
        98.00::numeric,
        'Sides',
        'https://images.unsplash.com/photo-1576107232684-1279f390859f?auto=format&fit=crop&w=900&q=80'
      ),
      (
        'Burgers Foundry',
        'Milkshake vainilla',
        'Batido espeso con helado artesanal.',
        85.00::numeric,
        'Bebidas',
        'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=900&q=80'
      ),
      (
        'Wok Distrito',
        'Pad thai pollo',
        'Fideos de arroz, pollo, cacahuate y limon.',
        178.00::numeric,
        'Wok',
        'https://images.unsplash.com/photo-1559314809-0d155014e29e?auto=format&fit=crop&w=900&q=80'
      ),
      (
        'Wok Distrito',
        'Arroz frito especial',
        'Arroz jazmin, verduras y proteina a elegir.',
        169.00::numeric,
        'Rice',
        'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=900&q=80'
      ),
      (
        'Wok Distrito',
        'Pollo agridulce',
        'Crujiente de pollo con salsa agridulce.',
        182.00::numeric,
        'Especialidades',
        'https://images.unsplash.com/photo-1525755662778-989d0524087e?auto=format&fit=crop&w=900&q=80'
      ),
      (
        'Ensalada Viva',
        'Bowl mediterraneo',
        'Base de quinoa, garbanzo, pepino y aderezo citrico.',
        158.00::numeric,
        'Bowls',
        'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80'
      ),
      (
        'Ensalada Viva',
        'Ensalada cesar pollo',
        'Lechuga romana, crutones y aderezo cesar.',
        148.00::numeric,
        'Ensaladas',
        'https://images.unsplash.com/photo-1546793665-c74683f339c1?auto=format&fit=crop&w=900&q=80'
      ),
      (
        'Ensalada Viva',
        'Wrap veggie',
        'Tortilla integral con hummus, espinaca y vegetales.',
        132.00::numeric,
        'Wraps',
        'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=900&q=80'
      )
  ) AS t(restaurant_name, name, description, price, category, image_url)
)
INSERT INTO products (restaurant_id, name, description, price, category, image_url, available)
SELECT
  r.id,
  m.name,
  m.description,
  m.price,
  m.category,
  m.image_url,
  true
FROM restaurants r
JOIN menu_items m ON m.restaurant_name = r.name
WHERE NOT EXISTS (
  SELECT 1
  FROM products existing
  WHERE existing.restaurant_id = r.id
    AND lower(existing.name) = lower(m.name)
);
