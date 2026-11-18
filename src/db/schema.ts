import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  role: text('role').notNull().default('creator'), // 'creator' | 'admin'
  plan: text('plan').notNull().default('pro'), // 'starter' | 'pro' | 'studio' | 'enterprise'
  credits: integer('credits').notNull().default(2500),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  description: text('description').default(''),
  aspectRatio: text('aspect_ratio').notNull().default('16:9'),
  targetResolution: text('target_resolution').notNull().default('4K'),
  exportFormat: text('export_format').notNull().default('MP4'),
  fps: integer('fps').notNull().default(24),
  gpuProfile: text('gpu_profile').notNull().default('cloud-a100'),
  status: text('status').notNull().default('draft'),
  thumbnailUrl: text('thumbnail_url'),
  storyboardJson: jsonb('storyboard_json'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const characters = pgTable('characters', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  roleLabel: text('role_label').default('Protagonist'),
  consistencySeed: integer('consistency_seed').notNull(),
  visualPromptAnchor: text('visual_prompt_anchor').notNull(),
  voicePersona: text('voice_persona').notNull().default('Kore'),
  referenceImageUrl: text('reference_image_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const renderJobs = pgTable('render_jobs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  projectId: integer('project_id').references(() => projects.id, {
    onDelete: 'set null',
  }),
  jobType: text('job_type').notNull(),
  title: text('title').notNull(),
  prompt: text('prompt').notNull(),
  modelId: text('model_id').notNull(),
  executionBackend: text('execution_backend').notNull(),
  gpuTarget: text('gpu_target').notNull(),
  resolution: text('resolution').notNull().default('1080p'),
  format: text('format').notNull().default('MP4'),
  durationSec: integer('duration_sec').notNull().default(10),
  progress: integer('progress').notNull().default(0),
  status: text('status').notNull().default('queued'),
  outputUrl: text('output_url'),
  outputMeta: jsonb('output_meta'),
  errorMessage: text('error_message'),
  creditsCost: integer('credits_cost').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
});

export const aiModels = pgTable('ai_models', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  provider: text('provider').notNull(),
  maxResolution: text('max_resolution').default('4K'),
  vramGb: integer('vram_gb').notNull().default(0),
  enabled: boolean('enabled').notNull().default(true),
  availability: text('availability').notNull().default('live'),
  description: text('description').default(''),
});

export const gpuNodes = pgTable('gpu_nodes', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  architecture: text('architecture').notNull(),
  location: text('location').notNull(),
  vramTotalGb: integer('vram_total_gb').notNull(),
  vramUsedGb: integer('vram_used_gb').notNull().default(0),
  cudaVersion: text('cuda_version').notNull(),
  utilizationPct: integer('utilization_pct').notNull().default(0),
  tempCelsius: integer('temp_celsius').notNull().default(42),
  status: text('status').notNull().default('online'),
});

export const subscriptions = pgTable('subscriptions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  plan: text('plan').notNull(),
  monthlyPriceUsd: integer('monthly_price_usd').notNull(),
  gpuQuotaHours: integer('gpu_quota_hours').notNull(),
  status: text('status').notNull().default('active'),
  renewDate: text('renew_date').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  characters: many(characters),
  renderJobs: many(renderJobs),
  subscriptions: many(subscriptions),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
  renderJobs: many(renderJobs),
}));

export const charactersRelations = relations(characters, ({ one }) => ({
  owner: one(users, {
    fields: [characters.userId],
    references: [users.id],
  }),
}));

export const renderJobsRelations = relations(renderJobs, ({ one }) => ({
  owner: one(users, {
    fields: [renderJobs.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [renderJobs.projectId],
    references: [projects.id],
  }),
}));
