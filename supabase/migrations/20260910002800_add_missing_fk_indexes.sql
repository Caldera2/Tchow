-- Keep foreign-key lookups and parent updates bounded as the tables grow.
create index if not exists catering_enquiries_user_id_idx
  on public.catering_enquiries (user_id);

create index if not exists order_items_product_id_idx
  on public.order_items (product_id);
