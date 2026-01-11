import { pgTable, text, timestamp, uuid, jsonb } from 'drizzle-orm/pg-core';

export const licenseTiers = ['basic', 'enterprise'] as const;
export type LicenseTier = (typeof licenseTiers)[number];

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  logoUrl: text('logo_url'),
  licenseTier: text('license_tier', { enum: licenseTiers }).notNull().default('basic'),
  licenseKey: text('license_key'),
  licenseExpiresAt: timestamp('license_expires_at', { withTimezone: true }),
  settings: jsonb('settings').$type<OrganizationSettings>().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export interface OrganizationSettings {
  allowPublicSignup?: boolean;
  requireApproval?: boolean;
  defaultUserRole?: string;
  ssoEnabled?: boolean;
  ssoProvider?: 'saml' | 'oidc';
  ssoConfig?: Record<string, unknown>;
  retentionDays?: number;
  maxStorageBytes?: number;
}

export const invitations = pgTable('invitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  role: text('role').notNull().default('member'),
  token: text('token').notNull().unique(),
  invitedById: uuid('invited_by_id'),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
