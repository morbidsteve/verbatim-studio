import { pgTable, text, timestamp, uuid, jsonb, index } from 'drizzle-orm/pg-core';
import { users } from './users';
import { organizations } from './organizations';

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').references(() => organizations.id),
    userId: uuid('user_id').references(() => users.id),
    action: text('action').notNull(),
    resourceType: text('resource_type').notNull(),
    resourceId: uuid('resource_id'),
    resourceName: text('resource_name'),
    details: jsonb('details').$type<AuditDetails>(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgIdx: index('audit_logs_org_idx').on(table.organizationId),
    userIdx: index('audit_logs_user_idx').on(table.userId),
    actionIdx: index('audit_logs_action_idx').on(table.action),
    resourceIdx: index('audit_logs_resource_idx').on(table.resourceType, table.resourceId),
    createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),
  })
);

export interface AuditDetails {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export const auditActions = [
  // Auth actions
  'user.login',
  'user.logout',
  'user.register',
  'user.password_reset',
  'user.password_change',

  // User management
  'user.create',
  'user.update',
  'user.delete',
  'user.approve',
  'user.suspend',
  'user.invite',

  // Organization
  'organization.update',
  'organization.settings_change',

  // Workspace
  'workspace.create',
  'workspace.update',
  'workspace.delete',
  'workspace.member_add',
  'workspace.member_remove',

  // Project
  'project.create',
  'project.update',
  'project.delete',
  'project.archive',
  'project.share',
  'project.unshare',

  // Recording
  'recording.upload',
  'recording.delete',
  'recording.transcribe',

  // Transcript
  'transcript.edit',
  'transcript.export',
  'transcript.summarize',

  // Export
  'export.create',
  'export.download',

  // Settings
  'settings.update',
] as const;

export type AuditAction = (typeof auditActions)[number];
