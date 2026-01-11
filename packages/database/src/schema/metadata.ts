import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  integer,
  boolean,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { projects } from './projects';
import { recordings } from './recordings';
import { users } from './users';
import { organizations } from './organizations';

/**
 * Custom metadata field definitions.
 * Organizations/users can define custom fields that can be attached to projects or recordings.
 */
export const customFieldTypes = [
  'text',
  'number',
  'date',
  'datetime',
  'boolean',
  'select',
  'multiselect',
  'url',
  'email',
  'phone',
] as const;
export type CustomFieldType = (typeof customFieldTypes)[number];

export const customFields = pgTable(
  'custom_fields',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').references(() => organizations.id, {
      onDelete: 'cascade',
    }),
    name: text('name').notNull(),
    label: text('label').notNull(),
    description: text('description'),
    type: text('type', { enum: customFieldTypes }).notNull(),
    entityType: text('entity_type', { enum: ['project', 'recording'] }).notNull(),

    // Field configuration
    isRequired: boolean('is_required').notNull().default(false),
    isSearchable: boolean('is_searchable').notNull().default(false),
    isVisibleInList: boolean('is_visible_in_list').notNull().default(false),
    displayOrder: integer('display_order').notNull().default(0),

    // Type-specific config
    config: jsonb('config').$type<CustomFieldConfig>().default({}),

    // Tracking
    createdById: uuid('created_by_id').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgEntityIdx: index('custom_fields_org_entity_idx').on(
      table.organizationId,
      table.entityType
    ),
    nameUnique: unique('custom_fields_name_org_unique').on(
      table.organizationId,
      table.name,
      table.entityType
    ),
  })
);

export interface CustomFieldConfig {
  // For select/multiselect
  options?: Array<{ value: string; label: string; color?: string }>;

  // For text
  maxLength?: number;
  pattern?: string;
  placeholder?: string;

  // For number
  min?: number;
  max?: number;
  step?: number;
  unit?: string;

  // For date/datetime
  minDate?: string;
  maxDate?: string;

  // Default value
  defaultValue?: unknown;
}

/**
 * Custom field values for projects.
 */
export const projectFieldValues = pgTable(
  'project_field_values',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    fieldId: uuid('field_id')
      .notNull()
      .references(() => customFields.id, { onDelete: 'cascade' }),
    value: jsonb('value').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    projectFieldIdx: unique('project_field_values_project_field_idx').on(
      table.projectId,
      table.fieldId
    ),
  })
);

/**
 * Custom field values for recordings.
 */
export const recordingFieldValues = pgTable(
  'recording_field_values',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    recordingId: uuid('recording_id')
      .notNull()
      .references(() => recordings.id, { onDelete: 'cascade' }),
    fieldId: uuid('field_id')
      .notNull()
      .references(() => customFields.id, { onDelete: 'cascade' }),
    value: jsonb('value').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    recordingFieldIdx: unique('recording_field_values_recording_field_idx').on(
      table.recordingId,
      table.fieldId
    ),
  })
);

/**
 * Tags for organizing content.
 */
export const tags = pgTable(
  'tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').references(() => organizations.id, {
      onDelete: 'cascade',
    }),
    name: text('name').notNull(),
    color: text('color'),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgNameIdx: unique('tags_org_name_unique').on(table.organizationId, table.name),
  })
);

export const projectTags = pgTable(
  'project_tags',
  {
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: unique('project_tags_pk').on(table.projectId, table.tagId),
  })
);

export const recordingTags = pgTable(
  'recording_tags',
  {
    recordingId: uuid('recording_id')
      .notNull()
      .references(() => recordings.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: unique('recording_tags_pk').on(table.recordingId, table.tagId),
  })
);
