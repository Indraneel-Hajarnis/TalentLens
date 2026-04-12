import { sqliteTable, text, integer, blob } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export const user = sqliteTable("user", {
					id: text("id").primaryKey(),
					name: text('name').notNull(),
					email: text('email').notNull().unique(),
					emailVerified: integer('emailVerified', { mode: 'boolean' }).notNull(),
					image: text('image'),
					createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
					updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull()
				});

				export const session = sqliteTable("session", {
					id: text("id").primaryKey(),
					expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
					token: text('token').notNull().unique(),
					createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
					updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
					ipAddress: text('ipAddress'),
					userAgent: text('userAgent'),
					userId: text('userId').notNull().references(() => user.id)
				});

				export const account = sqliteTable("account", {
					id: text("id").primaryKey(),
					accountId: text('accountId').notNull(),
					providerId: text('providerId').notNull(),
					userId: text('userId').notNull().references(() => user.id),
					accessToken: text('accessToken'),
					refreshToken: text('refreshToken'),
					idToken: text('idToken'),
					accessTokenExpiresAt: integer('accessTokenExpiresAt', { mode: 'timestamp' }),
					refreshTokenExpiresAt: integer('refreshTokenExpiresAt', { mode: 'timestamp' }),
					scope: text('scope'),
					password: text('password'),
					createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
					updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull()
				});

				export const verification = sqliteTable("verification", {
					id: text("id").primaryKey(),
					identifier: text('identifier').notNull(),
					value: text('value').notNull(),
					expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
					createdAt: integer('createdAt', { mode: 'timestamp' }),
					updatedAt: integer('updatedAt', { mode: 'timestamp' })
				});

export const resumes = sqliteTable("resumes", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull().references(() => user.id),
  filename: text("filename").notNull(),
  parsedText: text("parsedText"),
  fileData: blob("file_data"),
  contentType: text("content_type"),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
});

export const atsScores = sqliteTable("ats_scores", {
  id: text("id").primaryKey(),
  resumeId: text("resumeId").notNull().references(() => resumes.id),
  jobDescription: text("jobDescription"),
  scoreDetailsJson: text("scoreDetailsJson").notNull(),
  totalScore: integer("totalScore").notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
});

// Relations
export const userRelations = relations(user, ({ many }) => ({
  resumes: many(resumes),
}));

export const resumesRelations = relations(resumes, ({ one, many }) => ({
  user: one(user, {
    fields: [resumes.userId],
    references: [user.id],
  }),
  scores: many(atsScores),
}));

export const atsScoresRelations = relations(atsScores, ({ one }) => ({
  resume: one(resumes, {
    fields: [atsScores.resumeId],
    references: [resumes.id],
  }),
}));
