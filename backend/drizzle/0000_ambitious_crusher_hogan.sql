-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "passphoto_categories" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"category_id" text NOT NULL,
	"label" text NOT NULL,
	"columns" integer NOT NULL,
	"rows" integer NOT NULL,
	"aspect_label" text NOT NULL,
	"display_order" integer NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "passphoto_categories_category_id_key" UNIQUE("category_id")
);
--> statement-breakpoint
CREATE TABLE "passphoto_packs" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"category_id" uuid NOT NULL,
	"pack_id" text NOT NULL,
	"label" text NOT NULL,
	"copies" integer NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"description" text,
	"display_order" integer NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "passphoto_packs_pack_id_key" UNIQUE("pack_id")
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"email" text NOT NULL,
	"full_name" text NOT NULL,
	"phone" text,
	"role" text DEFAULT 'customer' NOT NULL,
	"avatar_url" text,
	"password_hash" text,
	"google_sub" text,
	"is_active" boolean DEFAULT true,
	"is_banned" boolean DEFAULT false,
	"is_email_verified" boolean DEFAULT false,
	"is_phone_verified" boolean DEFAULT false,
	"failed_login_attempts" integer DEFAULT 0,
	"last_failed_login" timestamp with time zone,
	"account_locked_until" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"last_active_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	CONSTRAINT "profiles_email_key" UNIQUE("email"),
	CONSTRAINT "profiles_google_sub_key" UNIQUE("google_sub"),
	CONSTRAINT "valid_role" CHECK (role = ANY (ARRAY['customer'::text, 'admin'::text, 'moderator'::text]))
);
--> statement-breakpoint
CREATE TABLE "passkey_credentials" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"user_id" uuid NOT NULL,
	"credential_id" text NOT NULL,
	"public_key" text NOT NULL,
	"counter" bigint DEFAULT 0 NOT NULL,
	"transports" text[],
	"device_type" text DEFAULT 'singleDevice' NOT NULL,
	"backed_up" boolean DEFAULT false NOT NULL,
	"aaguid" text,
	"friendly_name" text DEFAULT 'My Passkey' NOT NULL,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "passkey_credentials_credential_id_key" UNIQUE("credential_id"),
	CONSTRAINT "valid_device_type" CHECK (device_type = ANY (ARRAY['singleDevice'::text, 'multiDevice'::text]))
);
--> statement-breakpoint
CREATE TABLE "security_events" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"event_type" text NOT NULL,
	"user_id" uuid,
	"ip_address" text NOT NULL,
	"user_agent" text,
	"details" jsonb DEFAULT '{}'::jsonb,
	"severity" text DEFAULT 'low',
	"blocked" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "security_events_severity_check" CHECK (severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text, 'warning'::text]))
);
--> statement-breakpoint
CREATE TABLE "photocopies_single" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"option_id" text NOT NULL,
	"size_label" text NOT NULL,
	"size_key" text NOT NULL,
	"copies_text" text NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"aspect_ratio" text NOT NULL,
	"display_order" integer NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "photocopies_single_option_id_key" UNIQUE("option_id")
);
--> statement-breakpoint
CREATE TABLE "frame_materials" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"material_id" text NOT NULL,
	"label" text NOT NULL,
	"description" text NOT NULL,
	"display_order" integer NOT NULL,
	"is_active" boolean DEFAULT true,
	CONSTRAINT "frame_materials_material_id_key" UNIQUE("material_id")
);
--> statement-breakpoint
CREATE TABLE "frame_sizes" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"size_id" text NOT NULL,
	"size_label" text NOT NULL,
	"dimensions" text NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"aspect_ratio" text NOT NULL,
	"orientation" text NOT NULL,
	"display_order" integer NOT NULL,
	"is_active" boolean DEFAULT true,
	CONSTRAINT "frame_sizes_size_id_key" UNIQUE("size_id"),
	CONSTRAINT "valid_orientation" CHECK (orientation = ANY (ARRAY['portrait'::text, 'landscape'::text]))
);
--> statement-breakpoint
CREATE TABLE "snapnprint_categories" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"category_id" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"display_order" integer NOT NULL,
	"is_active" boolean DEFAULT true,
	CONSTRAINT "snapnprint_categories_category_id_key" UNIQUE("category_id")
);
--> statement-breakpoint
CREATE TABLE "snapnprint_packages" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"category_id" uuid NOT NULL,
	"package_id" text NOT NULL,
	"label" text NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"display_order" integer NOT NULL,
	"is_active" boolean DEFAULT true,
	CONSTRAINT "snapnprint_packages_package_id_key" UNIQUE("package_id")
);
--> statement-breakpoint
CREATE TABLE "album_capacities" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"capacity_id" text NOT NULL,
	"label" text NOT NULL,
	"images" integer NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"display_order" integer NOT NULL,
	"is_active" boolean DEFAULT true,
	CONSTRAINT "album_capacities_capacity_id_key" UNIQUE("capacity_id")
);
--> statement-breakpoint
CREATE TABLE "user_uploads" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"user_id" uuid NOT NULL,
	"storage_provider" text NOT NULL,
	"storage_url" text NOT NULL,
	"storage_path" text NOT NULL,
	"original_filename" text NOT NULL,
	"sanitized_filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_size_bytes" bigint NOT NULL,
	"width" integer,
	"height" integer,
	"aspect_ratio" numeric(10, 6),
	"processing_status" text DEFAULT 'pending',
	"is_approved" boolean DEFAULT false,
	"used_in_orders" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "valid_storage" CHECK (storage_provider = ANY (ARRAY['supabase'::text, 'cloudflare_r2'::text])),
	CONSTRAINT "valid_status" CHECK (processing_status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text]))
);
--> statement-breakpoint
CREATE TABLE "storage_metrics" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"user_id" uuid NOT NULL,
	"supabase_storage_used" bigint DEFAULT 0,
	"cloudflare_storage_used" bigint DEFAULT 0,
	"total_storage_used" bigint DEFAULT 0,
	"total_files" integer DEFAULT 0,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "storage_metrics_user_id_key" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"order_number" text NOT NULL,
	"user_id" uuid NOT NULL,
	"service_type" text NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"gift_wrap" boolean DEFAULT false,
	"gift_wrap_charge" numeric(10, 2) DEFAULT '30.00',
	"delivery_charge" numeric(10, 2) DEFAULT '0' NOT NULL,
	"customer_name" text NOT NULL,
	"customer_phone" text NOT NULL,
	"delivery_address" text,
	"address_house" text,
	"address_street" text,
	"address_landmark" text,
	"address_city" text,
	"address_state" text,
	"address_pincode" text,
	"event_date" date,
	"payment_status" text DEFAULT 'pending',
	"payment_method" text,
	"upi_transaction_id" text,
	"order_status" text DEFAULT 'pending' NOT NULL,
	"tracking_number" text,
	"courier_service" text,
	"internal_notes" text,
	"cancellation_reason" text,
	"feedback_rating" integer,
	"feedback_comment" text,
	"ip_address" "inet",
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "orders_order_number_key" UNIQUE("order_number"),
	CONSTRAINT "orders_feedback_rating_check" CHECK ((feedback_rating IS NULL) OR ((feedback_rating >= 1) AND (feedback_rating <= 5))),
	CONSTRAINT "valid_service" CHECK (service_type = ANY (ARRAY['PassPhoto'::text, 'PhotoCopies'::text, 'Frames'::text, 'Album'::text, 'SnapnPrint'::text])),
	CONSTRAINT "valid_payment_status" CHECK (payment_status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text, 'refunded'::text])),
	CONSTRAINT "valid_order_status" CHECK (order_status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'processing'::text, 'ready'::text, 'delivered'::text, 'cancelled'::text])),
	CONSTRAINT "orders_address_pincode_format" CHECK ((address_pincode IS NULL) OR (address_pincode ~ '^[1-9][0-9]{5}$'::text))
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"order_id" uuid NOT NULL,
	"passphoto_pack_id" uuid,
	"photocopies_single_id" uuid,
	"photocopies_set_id" uuid,
	"frame_size_id" uuid,
	"frame_material" text,
	"album_capacity_id" uuid,
	"snapnprint_package_id" uuid,
	"user_upload_id" uuid,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"total_price" numeric(10, 2) NOT NULL,
	"item_details" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "photocopies_set" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"set_id" text NOT NULL,
	"size_label" text NOT NULL,
	"size_key" text NOT NULL,
	"price_per_piece" numeric(10, 2) NOT NULL,
	"aspect_ratio" text NOT NULL,
	"copies_per_unit" integer NOT NULL,
	"display_order" integer NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "photocopies_set_set_id_key" UNIQUE("set_id")
);
--> statement-breakpoint
CREATE TABLE "order_item_uploads" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"order_item_id" uuid NOT NULL,
	"user_upload_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "uq_order_item_upload_position" UNIQUE("order_item_id","position"),
	CONSTRAINT "valid_position" CHECK ("position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"setting_key" text NOT NULL,
	"setting_value" jsonb NOT NULL,
	"description" text,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "settings_setting_key_key" UNIQUE("setting_key")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"user_id" uuid,
	"action" text NOT NULL,
	"table_name" text,
	"record_id" uuid,
	"old_values" jsonb,
	"new_values" jsonb,
	"ip_address" "inet",
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"user_agent" text,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone,
	CONSTRAINT "refresh_tokens_token_hash_key" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "auth_tokens" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"user_id" uuid NOT NULL,
	"purpose" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_tokens_token_hash_key" UNIQUE("token_hash"),
	CONSTRAINT "valid_purpose" CHECK (purpose = ANY (ARRAY['email_verification'::text, 'password_reset'::text]))
);
--> statement-breakpoint
CREATE TABLE "webauthn_challenges" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"user_id" uuid,
	"email" text,
	"challenge" text NOT NULL,
	"purpose" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "valid_webauthn_purpose" CHECK (purpose = ANY (ARRAY['registration'::text, 'authentication'::text]))
);
--> statement-breakpoint
ALTER TABLE "passphoto_packs" ADD CONSTRAINT "passphoto_packs_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."passphoto_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passkey_credentials" ADD CONSTRAINT "passkey_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snapnprint_packages" ADD CONSTRAINT "snapnprint_packages_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."snapnprint_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_uploads" ADD CONSTRAINT "user_uploads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storage_metrics" ADD CONSTRAINT "storage_metrics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_passphoto_pack_id_fkey" FOREIGN KEY ("passphoto_pack_id") REFERENCES "public"."passphoto_packs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_photocopies_single_id_fkey" FOREIGN KEY ("photocopies_single_id") REFERENCES "public"."photocopies_single"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_photocopies_set_id_fkey" FOREIGN KEY ("photocopies_set_id") REFERENCES "public"."photocopies_set"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_frame_size_id_fkey" FOREIGN KEY ("frame_size_id") REFERENCES "public"."frame_sizes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_album_capacity_id_fkey" FOREIGN KEY ("album_capacity_id") REFERENCES "public"."album_capacities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_snapnprint_package_id_fkey" FOREIGN KEY ("snapnprint_package_id") REFERENCES "public"."snapnprint_packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_user_upload_id_fkey" FOREIGN KEY ("user_upload_id") REFERENCES "public"."user_uploads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item_uploads" ADD CONSTRAINT "order_item_uploads_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item_uploads" ADD CONSTRAINT "order_item_uploads_user_upload_id_fkey" FOREIGN KEY ("user_upload_id") REFERENCES "public"."user_uploads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webauthn_challenges" ADD CONSTRAINT "webauthn_challenges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_passphoto_packs_category" ON "passphoto_packs" USING btree ("category_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_passkey_credential_id" ON "passkey_credentials" USING btree ("credential_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_passkey_user_id" ON "passkey_credentials" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_security_events_created_at" ON "security_events" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_security_events_severity" ON "security_events" USING btree ("severity" text_ops);--> statement-breakpoint
CREATE INDEX "idx_security_events_type" ON "security_events" USING btree ("event_type" text_ops);--> statement-breakpoint
CREATE INDEX "idx_security_events_user_id" ON "security_events" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_snapnprint_packages_category" ON "snapnprint_packages" USING btree ("category_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_uploads_storage_provider" ON "user_uploads" USING btree ("storage_provider" text_ops);--> statement-breakpoint
CREATE INDEX "idx_uploads_user_id" ON "user_uploads" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_orders_payment_status" ON "orders" USING btree ("payment_status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_orders_status" ON "orders" USING btree ("order_status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_orders_user_id" ON "orders" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_order_items_order_id" ON "order_items" USING btree ("order_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_order_item_uploads_order_item_id" ON "order_item_uploads" USING btree ("order_item_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_order_item_uploads_user_upload_id" ON "order_item_uploads" USING btree ("user_upload_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_refresh_tokens_expires_at" ON "refresh_tokens" USING btree ("expires_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_refresh_tokens_user_id" ON "refresh_tokens" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_auth_tokens_expires_at" ON "auth_tokens" USING btree ("expires_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_auth_tokens_user_purpose" ON "auth_tokens" USING btree ("user_id" text_ops,"purpose" text_ops);--> statement-breakpoint
CREATE INDEX "idx_webauthn_challenges_expires_at" ON "webauthn_challenges" USING btree ("expires_at" timestamptz_ops);
*/