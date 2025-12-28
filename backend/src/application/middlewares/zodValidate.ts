/**
 * Zod Validation Middleware
 * Validates request data against Zod schemas and maps errors to ValidationError
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError, ZodIssue } from 'zod';
import { ValidationError } from '../../shared/errors';

/**
 * Target for validation
 */
type ValidationTarget = 'body' | 'params' | 'query';

/**
 * Format Zod errors into field-level details
 */
function formatZodErrors(error: ZodError<unknown>): Array<{ field: string; message: string; code: string }> {
    return error.issues.map((issue: ZodIssue) => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
    }));
}

/**
 * Create validation middleware for a Zod schema
 * 
 * @param schema - Zod schema to validate against
 * @param target - Request property to validate ('body', 'params', or 'query')
 * 
 * @example
 * router.post('/orders', validateZod(CreateOrderSchema, 'body'), createOrder);
 */
export function validateZod<T>(
    schema: ZodSchema<T>,
    target: ValidationTarget = 'body'
) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        const data = req[target];

        const result = schema.safeParse(data);

        if (!result.success) {
            const details = formatZodErrors(result.error);
            const fieldMessages = details.map(d => `${d.field}: ${d.message}`).join(', ');

            throw new ValidationError(
                `Validation failed: ${fieldMessages}`,
                { errors: details }
            );
        }

        // Replace request data with parsed (and transformed) data
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (req as any)[target] = result.data;

        next();
    };
}

/**
 * Validate multiple targets with their respective schemas
 * 
 * @example
 * router.patch('/orders/:id/status', 
 *   validateMultiple([
 *     { schema: OrderIdParamSchema, target: 'params' },
 *     { schema: UpdateOrderStatusSchema, target: 'body' }
 *   ]), 
 *   updateOrderStatus
 * );
 */
export function validateMultiple(
    validations: Array<{ schema: ZodSchema<unknown>; target: ValidationTarget }>
) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        for (const { schema, target } of validations) {
            const data = req[target];
            const result = schema.safeParse(data);

            if (!result.success) {
                const details = formatZodErrors(result.error);
                const fieldMessages = details.map(d => `${d.field}: ${d.message}`).join(', ');

                throw new ValidationError(
                    `Validation failed (${target}): ${fieldMessages}`,
                    { errors: details, target }
                );
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (req as any)[target] = result.data;
        }

        next();
    };
}

