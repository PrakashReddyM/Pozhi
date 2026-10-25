// ==========================================
// ORDER READ QUERIES
//
// Supabase served nested resources through its select string:
//
//   .select('*, order_items(*, user_uploads(*),
//            order_item_uploads(position, user_uploads(*)))')
//
// Both frontends and the admin portal consume that exact shape, with
// snake_case keys. Rather than change three apps, these queries rebuild the
// same JSON in SQL, in one round trip and with no N+1.
//
// Two details make the output byte-compatible with what PostgREST returned:
//
//   * `to_jsonb(row)` is used instead of selecting columns directly, so
//     numeric(10,2) serialises as a JSON number (179.00) rather than the
//     string "179.00" that the pg driver would hand back.
//   * order_item_uploads is sorted by `position` inside the aggregate, which
//     is what the old sortItemUploads() helper was doing in JavaScript.
// ==========================================

import { SQL, sql } from 'drizzle-orm';
import { db } from '../../db';

/**
 * One order, with its items, each item's legacy single upload, and the
 * position-ordered list of all its uploads.
 */
const ORDER_WITH_ITEMS = sql`
  to_jsonb(o.*) || jsonb_build_object(
    'order_items',
    COALESCE((
      SELECT json_agg(item ORDER BY item_created)
      FROM (
        SELECT
          to_jsonb(oi.*) || jsonb_build_object(
            'user_uploads', (
              SELECT to_jsonb(u.*)
              FROM user_uploads u
              WHERE u.id = oi.user_upload_id
            ),
            'order_item_uploads', COALESCE((
              SELECT json_agg(
                jsonb_build_object('position', oiu.position, 'user_uploads', to_jsonb(u2.*))
                ORDER BY oiu.position
              )
              FROM order_item_uploads oiu
              JOIN user_uploads u2 ON u2.id = oiu.user_upload_id
              WHERE oiu.order_item_id = oi.id
            ), '[]'::json)
          ) AS item,
          oi.created_at AS item_created
        FROM order_items oi
        WHERE oi.order_id = o.id
      ) items
    ), '[]'::json)
  )
`;

/** db.execute returns either a result object or a bare array depending on driver. */
const rowsOf = (result: any): any[] => result?.rows ?? result ?? [];

/**
 * Fetch orders matching `where`, newest first.
 * `where` is interpolated as a prepared-statement fragment, never as text.
 */
export async function findOrders(options: {
  where: SQL;
  limit?: number;
  offset?: number;
}): Promise<any[]> {
  const { where, limit, offset } = options;

  const result = await db.execute(sql`
    SELECT ${ORDER_WITH_ITEMS} AS order
    FROM orders o
    WHERE ${where}
    ORDER BY o.created_at DESC
    ${limit !== undefined ? sql`LIMIT ${limit}` : sql``}
    ${offset !== undefined ? sql`OFFSET ${offset}` : sql``}
  `);

  return rowsOf(result).map((row) => row.order);
}

/** Fetch a single order, or null. */
export async function findOrder(where: SQL): Promise<any | null> {
  const orders = await findOrders({ where, limit: 1 });
  return orders[0] ?? null;
}
