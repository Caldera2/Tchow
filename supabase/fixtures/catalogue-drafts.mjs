import { MENU_CATEGORIES, MENU_ITEMS, BOX_SIZES } from '../../src/data/menuData.js';

const sqlString = (value) => `'${String(value ?? '').replaceAll("'", "''")}'`;
const cents = (value) => Math.round(Number(value) * 100);

console.log('begin;');
for (const [sortOrder, category] of MENU_CATEGORIES.entries()) {
  console.log(`insert into public.categories (legacy_key, name, slug, sort_order, is_public) values (${sqlString(category.id)}, ${sqlString(category.label)}, ${sqlString(category.id)}, ${sortOrder}, false) on conflict (legacy_key) do update set name = excluded.name, slug = excluded.slug, sort_order = excluded.sort_order, is_public = false;`);
}
for (const item of MENU_ITEMS) {
  const category = MENU_CATEGORIES.find((entry) => entry.id === item.category);
  const tags = `{${(item.tag ? [item.tag] : []).map((tag) => `"${String(tag).replaceAll('"', '\\"')}"`).join(',')}}`;
  console.log(`insert into public.products (legacy_key, category_id, name, description, status, price_kobo, preparation_minutes, tags) select ${sqlString(item.id)}, id, ${sqlString(item.name)}, ${sqlString(item.description)}, 'draft', ${cents(item.price)}, ${parseInt(item.prepTime, 10) || 0}, ${sqlString(tags)}::text[] from public.categories where legacy_key = ${sqlString(category?.id || item.category)} on conflict (legacy_key) do update set category_id = excluded.category_id, name = excluded.name, description = excluded.description, price_kobo = excluded.price_kobo, preparation_minutes = excluded.preparation_minutes, tags = excluded.tags, status = 'draft';`);
}
for (const box of BOX_SIZES) console.log(`insert into public.box_sizes (legacy_key, name, description, base_price_kobo, status) values (${sqlString(box.id)}, ${sqlString(box.name)}, ${sqlString(box.desc)}, ${cents(box.price)}, 'draft') on conflict (legacy_key) do update set name = excluded.name, description = excluded.description, base_price_kobo = excluded.base_price_kobo, status = 'draft';`);
console.log('commit;');
