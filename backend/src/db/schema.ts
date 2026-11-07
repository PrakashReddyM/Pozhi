// ==========================================
// GENERATED FILE - DO NOT EDIT
//
// Produced by: npm run db:pull
// Source of truth: db/init/01_schema.sql (applied to the database, then
// introspected back out). Edit the SQL, re-apply it, and re-run db:pull.
// ==========================================

import { pgTable, unique, uuid, text, integer, boolean, timestamp, index, foreignKey, numeric, check, bigint, jsonb, date, inet, uniqueIndex } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const passphotoCategories = pgTable("passphoto_categories", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	categoryId: text("category_id").notNull(),
	label: text().notNull(),
	columns: integer().notNull(),
	rows: integer().notNull(),
	aspectLabel: text("aspect_label").notNull(),
	displayOrder: integer("display_order").notNull(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	unique("passphoto_categories_category_id_key").on(table.categoryId),
]);

export const passphotoPacks = pgTable("passphoto_packs", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	categoryId: uuid("category_id").notNull(),
	packId: text("pack_id").notNull(),
	label: text().notNull(),
	copies: integer().notNull(),
	price: numeric({ precision: 10, scale:  2 }).notNull(),
	description: text(),
	displayOrder: integer("display_order").notNull(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_passphoto_packs_category").using("btree", table.categoryId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [passphotoCategories.id],
			name: "passphoto_packs_category_id_fkey"
		}).onDelete("cascade"),
	unique("passphoto_packs_pack_id_key").on(table.packId),
]);

export const profiles = pgTable("profiles", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	email: text().notNull(),
	fullName: text("full_name").notNull(),
	phone: text(),
	role: text().default('customer').notNull(),
	avatarUrl: text("avatar_url"),
	passwordHash: text("password_hash"),
	googleSub: text("google_sub"),
	isActive: boolean("is_active").default(true),
	isBanned: boolean("is_banned").default(false),
	isEmailVerified: boolean("is_email_verified").default(false),
	isPhoneVerified: boolean("is_phone_verified").default(false),
	failedLoginAttempts: integer("failed_login_attempts").default(0),
	lastFailedLogin: timestamp("last_failed_login", { withTimezone: true, mode: 'string' }),
	accountLockedUntil: timestamp("account_locked_until", { withTimezone: true, mode: 'string' }),
	lastLoginAt: timestamp("last_login_at", { withTimezone: true, mode: 'string' }),
	lastActiveAt: timestamp("last_active_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
}, (table) => [
	unique("profiles_email_key").on(table.email),
	unique("profiles_google_sub_key").on(table.googleSub),
	check("valid_role", sql`role = ANY (ARRAY['customer'::text, 'admin'::text, 'moderator'::text])`),
]);

export const passkeyCredentials = pgTable("passkey_credentials", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	credentialId: text("credential_id").notNull(),
	publicKey: text("public_key").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	counter: bigint({ mode: "number" }).default(0).notNull(),
	transports: text().array(),
	deviceType: text("device_type").default('singleDevice').notNull(),
	backedUp: boolean("backed_up").default(false).notNull(),
	aaguid: text(),
	friendlyName: text("friendly_name").default('My Passkey').notNull(),
	lastUsedAt: timestamp("last_used_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_passkey_credential_id").using("btree", table.credentialId.asc().nullsLast().op("text_ops")),
	index("idx_passkey_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [profiles.id],
			name: "passkey_credentials_user_id_fkey"
		}).onDelete("cascade"),
	unique("passkey_credentials_credential_id_key").on(table.credentialId),
	check("valid_device_type", sql`device_type = ANY (ARRAY['singleDevice'::text, 'multiDevice'::text])`),
]);

export const securityEvents = pgTable("security_events", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	eventType: text("event_type").notNull(),
	userId: uuid("user_id"),
	ipAddress: text("ip_address").notNull(),
	userAgent: text("user_agent"),
	details: jsonb().default({}),
	severity: text().default('low'),
	blocked: boolean().default(false),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_security_events_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_security_events_severity").using("btree", table.severity.asc().nullsLast().op("text_ops")),
	index("idx_security_events_type").using("btree", table.eventType.asc().nullsLast().op("text_ops")),
	index("idx_security_events_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [profiles.id],
			name: "security_events_user_id_fkey"
		}).onDelete("set null"),
	check("security_events_severity_check", sql`severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text, 'warning'::text])`),
]);

export const photocopiesSingle = pgTable("photocopies_single", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	optionId: text("option_id").notNull(),
	sizeLabel: text("size_label").notNull(),
	sizeKey: text("size_key").notNull(),
	copiesText: text("copies_text").notNull(),
	price: numeric({ precision: 10, scale:  2 }).notNull(),
	aspectRatio: text("aspect_ratio").notNull(),
	displayOrder: integer("display_order").notNull(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	unique("photocopies_single_option_id_key").on(table.optionId),
]);

export const frameMaterials = pgTable("frame_materials", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	materialId: text("material_id").notNull(),
	label: text().notNull(),
	description: text().notNull(),
	displayOrder: integer("display_order").notNull(),
	isActive: boolean("is_active").default(true),
}, (table) => [
	unique("frame_materials_material_id_key").on(table.materialId),
]);

export const frameSizes = pgTable("frame_sizes", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	sizeId: text("size_id").notNull(),
	sizeLabel: text("size_label").notNull(),
	dimensions: text().notNull(),
	price: numeric({ precision: 10, scale:  2 }).notNull(),
	aspectRatio: text("aspect_ratio").notNull(),
	orientation: text().notNull(),
	displayOrder: integer("display_order").notNull(),
	isActive: boolean("is_active").default(true),
}, (table) => [
	unique("frame_sizes_size_id_key").on(table.sizeId),
	check("valid_orientation", sql`orientation = ANY (ARRAY['portrait'::text, 'landscape'::text])`),
]);

export const snapnprintCategories = pgTable("snapnprint_categories", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	categoryId: text("category_id").notNull(),
	label: text().notNull(),
	description: text(),
	displayOrder: integer("display_order").notNull(),
	isActive: boolean("is_active").default(true),
}, (table) => [
	unique("snapnprint_categories_category_id_key").on(table.categoryId),
]);

export const snapnprintPackages = pgTable("snapnprint_packages", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	categoryId: uuid("category_id").notNull(),
	packageId: text("package_id").notNull(),
	label: text().notNull(),
	price: numeric({ precision: 10, scale:  2 }).notNull(),
	displayOrder: integer("display_order").notNull(),
	isActive: boolean("is_active").default(true),
}, (table) => [
	index("idx_snapnprint_packages_category").using("btree", table.categoryId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [snapnprintCategories.id],
			name: "snapnprint_packages_category_id_fkey"
		}).onDelete("cascade"),
	unique("snapnprint_packages_package_id_key").on(table.packageId),
]);

export const albumCapacities = pgTable("album_capacities", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	capacityId: text("capacity_id").notNull(),
	label: text().notNull(),
	images: integer().notNull(),
	price: numeric({ precision: 10, scale:  2 }).notNull(),
	displayOrder: integer("display_order").notNull(),
	isActive: boolean("is_active").default(true),
}, (table) => [
	unique("album_capacities_capacity_id_key").on(table.capacityId),
]);

export const userUploads = pgTable("user_uploads", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	storageProvider: text("storage_provider").notNull(),
	storageUrl: text("storage_url").notNull(),
	storagePath: text("storage_path").notNull(),
	originalFilename: text("original_filename").notNull(),
	sanitizedFilename: text("sanitized_filename").notNull(),
	mimeType: text("mime_type").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	fileSizeBytes: bigint("file_size_bytes", { mode: "number" }).notNull(),
	width: integer(),
	height: integer(),
	aspectRatio: numeric("aspect_ratio", { precision: 10, scale:  6 }),
	processingStatus: text("processing_status").default('pending'),
	isApproved: boolean("is_approved").default(false),
	usedInOrders: integer("used_in_orders").default(0),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_uploads_storage_provider").using("btree", table.storageProvider.asc().nullsLast().op("text_ops")),
	index("idx_uploads_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [profiles.id],
			name: "user_uploads_user_id_fkey"
		}).onDelete("cascade"),
	check("valid_storage", sql`storage_provider = ANY (ARRAY['supabase'::text, 'cloudflare_r2'::text])`),
	check("valid_status", sql`processing_status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text])`),
]);

export const storageMetrics = pgTable("storage_metrics", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	supabaseStorageUsed: bigint("supabase_storage_used", { mode: "number" }).default(0),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	cloudflareStorageUsed: bigint("cloudflare_storage_used", { mode: "number" }).default(0),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	totalStorageUsed: bigint("total_storage_used", { mode: "number" }).default(0),
	totalFiles: integer("total_files").default(0),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [profiles.id],
			name: "storage_metrics_user_id_fkey"
		}).onDelete("cascade"),
	unique("storage_metrics_user_id_key").on(table.userId),
]);

export const orders = pgTable("orders", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	orderNumber: text("order_number").notNull(),
	userId: uuid("user_id").notNull(),
	serviceType: text("service_type").notNull(),
	totalAmount: numeric("total_amount", { precision: 10, scale:  2 }).notNull(),
	giftWrap: boolean("gift_wrap").default(false),
	giftWrapCharge: numeric("gift_wrap_charge", { precision: 10, scale:  2 }).default('30.00'),
	deliveryCharge: numeric("delivery_charge", { precision: 10, scale:  2 }).default('0').notNull(),
	customerName: text("customer_name").notNull(),
	customerPhone: text("customer_phone").notNull(),
	deliveryAddress: text("delivery_address"),
	addressHouse: text("address_house"),
	addressStreet: text("address_street"),
	addressLandmark: text("address_landmark"),
	addressCity: text("address_city"),
	addressState: text("address_state"),
	addressPincode: text("address_pincode"),
	eventDate: date("event_date"),
	paymentStatus: text("payment_status").default('pending'),
	paymentMethod: text("payment_method"),
	upiTransactionId: text("upi_transaction_id"),
	orderStatus: text("order_status").default('pending').notNull(),
	trackingNumber: text("tracking_number"),
	courierService: text("courier_service"),
	internalNotes: text("internal_notes"),
	cancellationReason: text("cancellation_reason"),
	feedbackRating: integer("feedback_rating"),
	feedbackComment: text("feedback_comment"),
	ipAddress: inet("ip_address"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_orders_payment_status").using("btree", table.paymentStatus.asc().nullsLast().op("text_ops")),
	index("idx_orders_status").using("btree", table.orderStatus.asc().nullsLast().op("text_ops")),
	index("idx_orders_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [profiles.id],
			name: "orders_user_id_fkey"
		}).onDelete("restrict"),
	unique("orders_order_number_key").on(table.orderNumber),
	check("orders_feedback_rating_check", sql`(feedback_rating IS NULL) OR ((feedback_rating >= 1) AND (feedback_rating <= 5))`),
	check("valid_service", sql`service_type = ANY (ARRAY['PassPhoto'::text, 'PhotoCopies'::text, 'Frames'::text, 'Album'::text, 'SnapnPrint'::text])`),
	check("valid_payment_status", sql`payment_status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text, 'refunded'::text])`),
	check("valid_order_status", sql`order_status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'processing'::text, 'ready'::text, 'delivered'::text, 'cancelled'::text])`),
	check("orders_address_pincode_format", sql`(address_pincode IS NULL) OR (address_pincode ~ '^[1-9][0-9]{5}$'::text)`),
]);

export const orderItems = pgTable("order_items", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	orderId: uuid("order_id").notNull(),
	passphotoPackId: uuid("passphoto_pack_id"),
	photocopiesSingleId: uuid("photocopies_single_id"),
	photocopiesSetId: uuid("photocopies_set_id"),
	frameSizeId: uuid("frame_size_id"),
	frameMaterial: text("frame_material"),
	albumCapacityId: uuid("album_capacity_id"),
	snapnprintPackageId: uuid("snapnprint_package_id"),
	userUploadId: uuid("user_upload_id"),
	quantity: integer().default(1).notNull(),
	unitPrice: numeric("unit_price", { precision: 10, scale:  2 }).notNull(),
	totalPrice: numeric("total_price", { precision: 10, scale:  2 }).notNull(),
	itemDetails: jsonb("item_details").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_order_items_order_id").using("btree", table.orderId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "order_items_order_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.passphotoPackId],
			foreignColumns: [passphotoPacks.id],
			name: "order_items_passphoto_pack_id_fkey"
		}),
	foreignKey({
			columns: [table.photocopiesSingleId],
			foreignColumns: [photocopiesSingle.id],
			name: "order_items_photocopies_single_id_fkey"
		}),
	foreignKey({
			columns: [table.photocopiesSetId],
			foreignColumns: [photocopiesSet.id],
			name: "order_items_photocopies_set_id_fkey"
		}),
	foreignKey({
			columns: [table.frameSizeId],
			foreignColumns: [frameSizes.id],
			name: "order_items_frame_size_id_fkey"
		}),
	foreignKey({
			columns: [table.albumCapacityId],
			foreignColumns: [albumCapacities.id],
			name: "order_items_album_capacity_id_fkey"
		}),
	foreignKey({
			columns: [table.snapnprintPackageId],
			foreignColumns: [snapnprintPackages.id],
			name: "order_items_snapnprint_package_id_fkey"
		}),
	foreignKey({
			columns: [table.userUploadId],
			foreignColumns: [userUploads.id],
			name: "order_items_user_upload_id_fkey"
		}),
]);

export const photocopiesSet = pgTable("photocopies_set", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	setId: text("set_id").notNull(),
	sizeLabel: text("size_label").notNull(),
	sizeKey: text("size_key").notNull(),
	pricePerPiece: numeric("price_per_piece", { precision: 10, scale:  2 }).notNull(),
	aspectRatio: text("aspect_ratio").notNull(),
	copiesPerUnit: integer("copies_per_unit").notNull(),
	displayOrder: integer("display_order").notNull(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	unique("photocopies_set_set_id_key").on(table.setId),
]);

export const orderItemUploads = pgTable("order_item_uploads", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	orderItemId: uuid("order_item_id").notNull(),
	userUploadId: uuid("user_upload_id").notNull(),
	position: integer().default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_order_item_uploads_order_item_id").using("btree", table.orderItemId.asc().nullsLast().op("uuid_ops")),
	index("idx_order_item_uploads_user_upload_id").using("btree", table.userUploadId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.orderItemId],
			foreignColumns: [orderItems.id],
			name: "order_item_uploads_order_item_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userUploadId],
			foreignColumns: [userUploads.id],
			name: "order_item_uploads_user_upload_id_fkey"
		}).onDelete("cascade"),
	unique("uq_order_item_upload_position").on(table.orderItemId, table.position),
	check("valid_position", sql`"position" >= 0`),
]);

export const settings = pgTable("settings", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	settingKey: text("setting_key").notNull(),
	settingValue: jsonb("setting_value").notNull(),
	description: text(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	unique("settings_setting_key_key").on(table.settingKey),
]);

export const auditLogs = pgTable("audit_logs", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	userId: uuid("user_id"),
	action: text().notNull(),
	tableName: text("table_name"),
	recordId: uuid("record_id"),
	oldValues: jsonb("old_values"),
	newValues: jsonb("new_values"),
	ipAddress: inet("ip_address"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [profiles.id],
			name: "audit_logs_user_id_fkey"
		}),
]);

export const refreshTokens = pgTable("refresh_tokens", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	tokenHash: text("token_hash").notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	revokedAt: timestamp("revoked_at", { withTimezone: true, mode: 'string' }),
	userAgent: text("user_agent"),
	ipAddress: text("ip_address"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	lastUsedAt: timestamp("last_used_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_refresh_tokens_expires_at").using("btree", table.expiresAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_refresh_tokens_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [profiles.id],
			name: "refresh_tokens_user_id_fkey"
		}).onDelete("cascade"),
	unique("refresh_tokens_token_hash_key").on(table.tokenHash),
]);

export const authTokens = pgTable("auth_tokens", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	purpose: text().notNull(),
	tokenHash: text("token_hash").notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	consumedAt: timestamp("consumed_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_auth_tokens_expires_at").using("btree", table.expiresAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_auth_tokens_user_purpose").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.purpose.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [profiles.id],
			name: "auth_tokens_user_id_fkey"
		}).onDelete("cascade"),
	unique("auth_tokens_token_hash_key").on(table.tokenHash),
	check("valid_purpose", sql`purpose = ANY (ARRAY['email_verification'::text, 'password_reset'::text])`),
]);

export const webauthnChallenges = pgTable("webauthn_challenges", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	userId: uuid("user_id"),
	email: text(),
	challenge: text().notNull(),
	purpose: text().notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_webauthn_challenges_expires_at").using("btree", table.expiresAt.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [profiles.id],
			name: "webauthn_challenges_user_id_fkey"
		}).onDelete("cascade"),
	check("valid_webauthn_purpose", sql`purpose = ANY (ARRAY['registration'::text, 'authentication'::text])`),
]);

export const addresses = pgTable("addresses", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	label: text().notNull(),
	recipientName: text("recipient_name").notNull(),
	phone: text().notNull(),
	streetLine1: text("street_line1").notNull(),
	streetLine2: text("street_line2"),
	landmark: text(),
	city: text().notNull(),
	state: text().notNull(),
	zipCode: text("zip_code").notNull(),
	country: text().default('India').notNull(),
	isDefault: boolean("is_default").default(false),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("idx_addresses_one_default").using("btree", table.userId.asc().nullsLast().op("uuid_ops")).where(sql`(is_default AND is_active)`),
	index("idx_addresses_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [profiles.id],
			name: "addresses_user_id_fkey"
		}).onDelete("cascade"),
	check("addresses_zip_format", sql`zip_code ~ '^[1-9][0-9]{5}$'::text`),
]);
