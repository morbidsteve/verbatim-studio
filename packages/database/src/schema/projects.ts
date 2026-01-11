import { pgTable, text, timestamp, uuid, jsonb, index } from 'drizzle-orm/pg-core';
import { users } from './users';
import { workspaces } from './workspaces';

export const projectStatuses = ['active', 'archived', 'deleted'] as const;
export type ProjectStatus = (typeof projectStatuses)[number];

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    description: text('description'),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id),
    workspaceId: uuid('workspace_id').references(() => workspaces.id),
    parentId: uuid('parent_id'), // Self-reference for folders
    templateId: uuid('template_id'),
    status: text('status', { enum: projectStatuses }).notNull().default('active'),
    settings: jsonb('settings').$type<ProjectSettings>().default({}),
    metadata: jsonb('metadata').$type<ProjectMetadata>().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ownerIdx: index('projects_owner_idx').on(table.ownerId),
    workspaceIdx: index('projects_workspace_idx').on(table.workspaceId),
    parentIdx: index('projects_parent_idx').on(table.parentId),
  })
);

export interface ProjectSettings {
  defaultLanguage?: string;
  defaultModel?: string;
  autoTranscribe?: boolean;
  retentionDays?: number;
}

export interface ProjectMetadata {
  recordingCount?: number;
  totalDuration?: number;
  totalSize?: number;
  customFields?: Record<string, unknown>;
}

export const projectShares = pgTable(
  'project_shares',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    permission: text('permission', { enum: ['view', 'edit', 'admin'] })
      .notNull()
      .default('view'),
    sharedById: uuid('shared_by_id').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    projectUserIdx: index('project_shares_project_user_idx').on(table.projectId, table.userId),
  })
);
