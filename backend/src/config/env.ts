/**
 * Environment configuration with runtime validation
 */

import * as path from 'path';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ path: path.join(__dirname, '../../.env') });

type NodeEnv = 'development' | 'test' | 'production';

const envSchema = z
    .object({
        NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
        DATABASE_URL: z.string().optional(),
        DB_USER: z.string().optional(),
        DB_PASSWORD: z.string().optional(),
        DB_NAME: z.string().optional(),
        DB_HOST: z.string().optional(),
        DB_PORT: z.coerce.number().int().positive().default(5432),
        DB_POOL_MAX: z.coerce.number().int().positive().optional(),
        DB_POOL_MIN: z.coerce.number().int().nonnegative().optional(),
        DB_POOL_ACQUIRE: z.coerce.number().int().positive().optional(),
        DB_POOL_IDLE: z.coerce.number().int().positive().optional(),
        LOG_LEVEL: z.string().optional(),
        EVENT_LOG_LEVEL: z.string().optional(),
        JWT_SECRET: z.string().optional(),
        JWT_EXPIRE: z.string().optional(),
        JWT_REFRESH_SECRET: z.string().optional(),
        JWT_REFRESH_EXPIRE: z.string().optional(),
    })
    .superRefine((value, ctx) => {
        if (value.NODE_ENV !== 'production' || value.DATABASE_URL) {
            return;
        }

        const required: Array<keyof typeof value> = ['DB_USER', 'DB_PASSWORD', 'DB_NAME', 'DB_HOST'];

        required.forEach((key) => {
            if (!value[key]) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `Missing ${key} for production environment`,
                    path: [key],
                });
            }
        });
    });

const env = envSchema.parse(process.env);

export type Env = z.infer<typeof envSchema> & { NODE_ENV: NodeEnv };
export { env, envSchema };

// CommonJS compatibility
module.exports = {
    env,
    envSchema,
};
