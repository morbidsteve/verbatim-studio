import { pgTable, text, timestamp, uuid, jsonb, boolean, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { users } from './users';

export const templates = pgTable(
  'templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').references(() => organizations.id),
    createdById: uuid('created_by_id').references(() => users.id),
    type: text('type', { enum: ['project', 'recording'] }).notNull(),
    name: text('name').notNull(),
    description: text('description'),
    settings: jsonb('settings').notNull().default({}),
    isDefault: boolean('is_default').notNull().default(false),
    isBuiltIn: boolean('is_built_in').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgIdx: index('templates_org_idx').on(table.organizationId),
    typeIdx: index('templates_type_idx').on(table.type),
  })
);

export const customFields = pgTable(
  'custom_fields',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').references(() => organizations.id),
    entityType: text('entity_type', { enum: ['project', 'recording', 'speaker'] }).notNull(),
    name: text('name').notNull(),
    fieldType: text('field_type', {
      enum: ['text', 'number', 'date', 'select', 'multi-select', 'boolean'],
    }).notNull(),
    required: boolean('required').notNull().default(false),
    options: jsonb('options').$type<string[]>(),
    defaultValue: jsonb('default_value'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgEntityIdx: index('custom_fields_org_entity_idx').on(table.organizationId, table.entityType),
  })
);

export const promptTemplates = pgTable(
  'prompt_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').references(() => organizations.id),
    createdById: uuid('created_by_id').references(() => users.id),
    name: text('name').notNull(),
    description: text('description'),
    category: text('category', {
      enum: ['summarization', 'extraction', 'analysis', 'chat', 'custom'],
    }).notNull(),
    systemPrompt: text('system_prompt').notNull(),
    userPromptTemplate: text('user_prompt_template').notNull(),
    variables: jsonb('variables').$type<string[]>().default([]),
    isBuiltIn: boolean('is_built_in').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgCategoryIdx: index('prompt_templates_org_category_idx').on(
      table.organizationId,
      table.category
    ),
  })
);
