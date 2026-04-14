import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/async-handler.js";
import { query } from "../../lib/db.js";
import { HttpError } from "../../lib/http-error.js";
import { requireAuth } from "../../middlewares/auth.js";
import { requireRole } from "../../middlewares/require-role.js";

const UpsertRestaurantSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(255).optional(),
  address: z.string().min(4).max(250),
  phone: z.string().max(30).optional(),
  isOpen: z.boolean().default(true)
});

const CreateProductSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(255).optional(),
  price: z.coerce.number().positive(),
  category: z.string().max(60).optional(),
  imageUrl: z.string().url().max(1500).optional(),
  available: z.boolean().default(true)
});

const UpdateProductSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(255).nullable().optional(),
  price: z.coerce.number().positive().optional(),
  category: z.string().max(60).nullable().optional(),
  imageUrl: z.string().url().max(1500).nullable().optional(),
  available: z.boolean().optional()
});

async function getRestaurantForOwner(ownerUserId: string) {
  const rows = await query<{
    id: number;
    owner_user_id: string;
    name: string;
    description: string | null;
    address: string;
    phone: string | null;
    is_open: boolean;
    created_at: string;
    updated_at: string;
  }>(
    `
    SELECT id, owner_user_id, name, description, address, phone, is_open, created_at, updated_at
    FROM restaurants
    WHERE owner_user_id = $1
    `,
    [ownerUserId]
  );

  return rows[0] ?? null;
}

export const restaurantsRouter = Router();

restaurantsRouter.get(
  "/",
  asyncHandler(async (request, response) => {
    const search = String(request.query.search ?? "").trim();

    const restaurants = await query<{
      id: number;
      name: string;
      description: string | null;
      address: string;
      phone: string | null;
      is_open: boolean;
      created_at: string;
    }>(
      `
      SELECT id, name, description, address, phone, is_open, created_at
      FROM restaurants
      WHERE ($1 = '' OR name ILIKE '%' || $1 || '%')
      ORDER BY is_open DESC, created_at DESC
      LIMIT 100
      `,
      [search]
    );

    response.json({ restaurants });
  })
);

restaurantsRouter.get(
  "/me",
  requireAuth,
  requireRole(["restaurant"]),
  asyncHandler(async (request, response) => {
    const user = request.currentUser!;
    const restaurant = await getRestaurantForOwner(user.authUserId);
    if (!restaurant) {
      response.status(404).json({
        error: "Restaurant profile not found. Create it first with PUT /restaurants/me."
      });
      return;
    }

    response.json({ restaurant });
  })
);

restaurantsRouter.put(
  "/me",
  requireAuth,
  requireRole(["restaurant"]),
  asyncHandler(async (request, response) => {
    const parsed = UpsertRestaurantSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new HttpError(400, "Invalid restaurant payload.", parsed.error.flatten());
    }

    const user = request.currentUser!;
    const current = await getRestaurantForOwner(user.authUserId);

    if (!current) {
      const createdRows = await query<{
        id: number;
        owner_user_id: string;
        name: string;
        description: string | null;
        address: string;
        phone: string | null;
        is_open: boolean;
        created_at: string;
        updated_at: string;
      }>(
        `
        INSERT INTO restaurants (owner_user_id, name, description, address, phone, is_open)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, owner_user_id, name, description, address, phone, is_open, created_at, updated_at
        `,
        [
          user.authUserId,
          parsed.data.name,
          parsed.data.description ?? null,
          parsed.data.address,
          parsed.data.phone ?? null,
          parsed.data.isOpen
        ]
      );

      response.status(201).json({ restaurant: createdRows[0] });
      return;
    }

    const updatedRows = await query<{
      id: number;
      owner_user_id: string;
      name: string;
      description: string | null;
      address: string;
      phone: string | null;
      is_open: boolean;
      created_at: string;
      updated_at: string;
    }>(
      `
      UPDATE restaurants
      SET
        name = $1,
        description = $2,
        address = $3,
        phone = $4,
        is_open = $5,
        updated_at = now()
      WHERE owner_user_id = $6
      RETURNING id, owner_user_id, name, description, address, phone, is_open, created_at, updated_at
      `,
      [
        parsed.data.name,
        parsed.data.description ?? null,
        parsed.data.address,
        parsed.data.phone ?? null,
        parsed.data.isOpen,
        user.authUserId
      ]
    );

    response.json({ restaurant: updatedRows[0] });
  })
);

restaurantsRouter.get(
  "/:restaurantId(\\d+)/products",
  asyncHandler(async (request, response) => {
    const restaurantId = Number.parseInt(request.params.restaurantId, 10);
    if (Number.isNaN(restaurantId)) {
      throw new HttpError(400, "restaurantId must be numeric.");
    }

    const includeUnavailable = String(request.query.includeUnavailable ?? "false") === "true";

    const products = await query<{
      id: number;
      restaurant_id: number;
      name: string;
      description: string | null;
      price: number;
      category: string | null;
      image_url: string | null;
      available: boolean;
      created_at: string;
    }>(
      `
      SELECT id, restaurant_id, name, description, price, category, image_url, available, created_at
      FROM products
      WHERE restaurant_id = $1
        AND ($2::boolean = true OR available = true)
      ORDER BY created_at DESC
      `,
      [restaurantId, includeUnavailable]
    );

    response.json({ products });
  })
);

restaurantsRouter.get(
  "/me/products",
  requireAuth,
  requireRole(["restaurant"]),
  asyncHandler(async (request, response) => {
    const user = request.currentUser!;
    const restaurant = await getRestaurantForOwner(user.authUserId);
    if (!restaurant) {
      throw new HttpError(404, "Create your restaurant profile before managing products.");
    }

    const products = await query<{
      id: number;
      restaurant_id: number;
      name: string;
      description: string | null;
      price: number;
      category: string | null;
      image_url: string | null;
      available: boolean;
      created_at: string;
    }>(
      `
      SELECT id, restaurant_id, name, description, price, category, image_url, available, created_at
      FROM products
      WHERE restaurant_id = $1
      ORDER BY created_at DESC
      `,
      [restaurant.id]
    );

    response.json({ products });
  })
);

restaurantsRouter.post(
  "/me/products",
  requireAuth,
  requireRole(["restaurant"]),
  asyncHandler(async (request, response) => {
    const parsed = CreateProductSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new HttpError(400, "Invalid product payload.", parsed.error.flatten());
    }

    const user = request.currentUser!;
    const restaurant = await getRestaurantForOwner(user.authUserId);
    if (!restaurant) {
      throw new HttpError(404, "Create your restaurant profile before publishing products.");
    }

    const rows = await query<{
      id: number;
      restaurant_id: number;
      name: string;
      description: string | null;
      price: number;
      category: string | null;
      image_url: string | null;
      available: boolean;
      created_at: string;
    }>(
      `
      INSERT INTO products (restaurant_id, name, description, price, category, image_url, available)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, restaurant_id, name, description, price, category, image_url, available, created_at
      `,
      [
        restaurant.id,
        parsed.data.name,
        parsed.data.description ?? null,
        parsed.data.price,
        parsed.data.category ?? null,
        parsed.data.imageUrl ?? null,
        parsed.data.available
      ]
    );

    response.status(201).json({ product: rows[0] });
  })
);

restaurantsRouter.patch(
  "/me/products/:productId",
  requireAuth,
  requireRole(["restaurant"]),
  asyncHandler(async (request, response) => {
    const productId = Number.parseInt(request.params.productId, 10);
    if (Number.isNaN(productId)) {
      throw new HttpError(400, "productId must be numeric.");
    }

    const parsed = UpdateProductSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new HttpError(400, "Invalid product payload.", parsed.error.flatten());
    }

    const user = request.currentUser!;
    const restaurant = await getRestaurantForOwner(user.authUserId);
    if (!restaurant) {
      throw new HttpError(404, "Create your restaurant profile before managing products.");
    }

    const rows = await query<{
      id: number;
      restaurant_id: number;
      name: string;
      description: string | null;
      price: number;
      category: string | null;
      image_url: string | null;
      available: boolean;
      created_at: string;
    }>(
      `
      UPDATE products
      SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        price = COALESCE($3, price),
        category = COALESCE($4, category),
        available = COALESCE($5, available),
        image_url = COALESCE($6, image_url)
      WHERE id = $7 AND restaurant_id = $8
      RETURNING id, restaurant_id, name, description, price, category, image_url, available, created_at
      `,
      [
        parsed.data.name ?? null,
        parsed.data.description ?? null,
        parsed.data.price ?? null,
        parsed.data.category ?? null,
        parsed.data.available ?? null,
        parsed.data.imageUrl ?? null,
        productId,
        restaurant.id
      ]
    );

    if (!rows[0]) {
      throw new HttpError(404, "Product not found for this restaurant.");
    }

    response.json({ product: rows[0] });
  })
);

restaurantsRouter.delete(
  "/me/products/:productId",
  requireAuth,
  requireRole(["restaurant"]),
  asyncHandler(async (request, response) => {
    const productId = Number.parseInt(request.params.productId, 10);
    if (Number.isNaN(productId)) {
      throw new HttpError(400, "productId must be numeric.");
    }

    const user = request.currentUser!;
    const restaurant = await getRestaurantForOwner(user.authUserId);
    if (!restaurant) {
      throw new HttpError(404, "Create your restaurant profile before managing products.");
    }

    const rows = await query<{ id: number }>(
      `
      DELETE FROM products
      WHERE id = $1 AND restaurant_id = $2
      RETURNING id
      `,
      [productId, restaurant.id]
    );

    if (!rows[0]) {
      throw new HttpError(404, "Product not found for this restaurant.");
    }

    response.status(204).send();
  })
);
