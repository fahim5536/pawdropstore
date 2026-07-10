import { pgTable, serial, text, integer, doublePrecision, timestamp } from 'drizzle-orm/pg-core';

// Define the 'products' table for scalable, central store inventory
export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  cjPid: text('cj_pid').unique(), // For dropshipped/imported items
  name: text('name').notNull(),
  category: text('category').notNull(),
  price: doublePrecision('price').notNull(),
  desc: text('description'),
  img: text('img'),
  sold: integer('sold').default(0),
  rating: doublePrecision('rating').default(4.5),
  quantity: integer('quantity').default(100), // Scalable inventory level attribute
  createdAt: timestamp('created_at').defaultNow()
});

// Track standard or custom products that have been soft-deleted/removed
export const deletedProducts = pgTable('deleted_products', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull(),
  deletedAt: timestamp('deleted_at').defaultNow()
});
