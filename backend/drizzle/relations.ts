import { relations } from "drizzle-orm/relations";
import { passphotoCategories, passphotoPacks, profiles, passkeyCredentials, securityEvents, snapnprintCategories, snapnprintPackages, userUploads, storageMetrics, orders, orderItems, photocopiesSingle, photocopiesSet, frameSizes, albumCapacities, orderItemUploads, auditLogs, refreshTokens, authTokens, webauthnChallenges, addresses } from "./schema";

export const passphotoPacksRelations = relations(passphotoPacks, ({one, many}) => ({
	passphotoCategory: one(passphotoCategories, {
		fields: [passphotoPacks.categoryId],
		references: [passphotoCategories.id]
	}),
	orderItems: many(orderItems),
}));

export const passphotoCategoriesRelations = relations(passphotoCategories, ({many}) => ({
	passphotoPacks: many(passphotoPacks),
}));

export const passkeyCredentialsRelations = relations(passkeyCredentials, ({one}) => ({
	profile: one(profiles, {
		fields: [passkeyCredentials.userId],
		references: [profiles.id]
	}),
}));

export const profilesRelations = relations(profiles, ({many}) => ({
	passkeyCredentials: many(passkeyCredentials),
	securityEvents: many(securityEvents),
	userUploads: many(userUploads),
	storageMetrics: many(storageMetrics),
	orders: many(orders),
	auditLogs: many(auditLogs),
	refreshTokens: many(refreshTokens),
	authTokens: many(authTokens),
	webauthnChallenges: many(webauthnChallenges),
	addresses: many(addresses),
}));

export const securityEventsRelations = relations(securityEvents, ({one}) => ({
	profile: one(profiles, {
		fields: [securityEvents.userId],
		references: [profiles.id]
	}),
}));

export const snapnprintPackagesRelations = relations(snapnprintPackages, ({one, many}) => ({
	snapnprintCategory: one(snapnprintCategories, {
		fields: [snapnprintPackages.categoryId],
		references: [snapnprintCategories.id]
	}),
	orderItems: many(orderItems),
}));

export const snapnprintCategoriesRelations = relations(snapnprintCategories, ({many}) => ({
	snapnprintPackages: many(snapnprintPackages),
}));

export const userUploadsRelations = relations(userUploads, ({one, many}) => ({
	profile: one(profiles, {
		fields: [userUploads.userId],
		references: [profiles.id]
	}),
	orderItems: many(orderItems),
	orderItemUploads: many(orderItemUploads),
}));

export const storageMetricsRelations = relations(storageMetrics, ({one}) => ({
	profile: one(profiles, {
		fields: [storageMetrics.userId],
		references: [profiles.id]
	}),
}));

export const ordersRelations = relations(orders, ({one, many}) => ({
	profile: one(profiles, {
		fields: [orders.userId],
		references: [profiles.id]
	}),
	orderItems: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({one, many}) => ({
	order: one(orders, {
		fields: [orderItems.orderId],
		references: [orders.id]
	}),
	passphotoPack: one(passphotoPacks, {
		fields: [orderItems.passphotoPackId],
		references: [passphotoPacks.id]
	}),
	photocopiesSingle: one(photocopiesSingle, {
		fields: [orderItems.photocopiesSingleId],
		references: [photocopiesSingle.id]
	}),
	photocopiesSet: one(photocopiesSet, {
		fields: [orderItems.photocopiesSetId],
		references: [photocopiesSet.id]
	}),
	frameSize: one(frameSizes, {
		fields: [orderItems.frameSizeId],
		references: [frameSizes.id]
	}),
	albumCapacity: one(albumCapacities, {
		fields: [orderItems.albumCapacityId],
		references: [albumCapacities.id]
	}),
	snapnprintPackage: one(snapnprintPackages, {
		fields: [orderItems.snapnprintPackageId],
		references: [snapnprintPackages.id]
	}),
	userUpload: one(userUploads, {
		fields: [orderItems.userUploadId],
		references: [userUploads.id]
	}),
	orderItemUploads: many(orderItemUploads),
}));

export const photocopiesSingleRelations = relations(photocopiesSingle, ({many}) => ({
	orderItems: many(orderItems),
}));

export const photocopiesSetRelations = relations(photocopiesSet, ({many}) => ({
	orderItems: many(orderItems),
}));

export const frameSizesRelations = relations(frameSizes, ({many}) => ({
	orderItems: many(orderItems),
}));

export const albumCapacitiesRelations = relations(albumCapacities, ({many}) => ({
	orderItems: many(orderItems),
}));

export const orderItemUploadsRelations = relations(orderItemUploads, ({one}) => ({
	orderItem: one(orderItems, {
		fields: [orderItemUploads.orderItemId],
		references: [orderItems.id]
	}),
	userUpload: one(userUploads, {
		fields: [orderItemUploads.userUploadId],
		references: [userUploads.id]
	}),
}));

export const auditLogsRelations = relations(auditLogs, ({one}) => ({
	profile: one(profiles, {
		fields: [auditLogs.userId],
		references: [profiles.id]
	}),
}));

export const refreshTokensRelations = relations(refreshTokens, ({one}) => ({
	profile: one(profiles, {
		fields: [refreshTokens.userId],
		references: [profiles.id]
	}),
}));

export const authTokensRelations = relations(authTokens, ({one}) => ({
	profile: one(profiles, {
		fields: [authTokens.userId],
		references: [profiles.id]
	}),
}));

export const webauthnChallengesRelations = relations(webauthnChallenges, ({one}) => ({
	profile: one(profiles, {
		fields: [webauthnChallenges.userId],
		references: [profiles.id]
	}),
}));

export const addressesRelations = relations(addresses, ({one}) => ({
	profile: one(profiles, {
		fields: [addresses.userId],
		references: [profiles.id]
	}),
}));