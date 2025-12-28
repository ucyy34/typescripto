/**
 * Pagination Utilities
 * Cursor and offset-based pagination helpers
 */

import { Op } from 'sequelize';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 60;

const SORT_FIELD_MAP: Record<string, string> = {
    created_at: 'created_at',
    price: 'price',
    rating: 'rating',
    total_sales: 'total_sales',
    updated_at: 'updated_at',
};

interface CursorPayload {
    f: string;
    v: unknown;
    id?: string | number;
}

interface ParsedPagination {
    limit: number;
    page: number;
    offset: number;
    order: [string, string][];
    sortField: string;
    sortDirection: 'ASC' | 'DESC';
    cursor: CursorPayload | null;
    rawCursor: string | null;
    usingCursor: boolean;
}

interface PaginationQuery {
    limit?: string | number;
    page?: string | number;
    sort?: string;
    cursor?: string;
}

const parseBoolean = (value: unknown): boolean => {
    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
        if (['false', '0', 'no', 'off'].includes(normalized)) return false;
    }

    if (typeof value === 'number') {
        return value !== 0;
    }

    return false;
};

const clampNumber = (raw: unknown, { min, max, fallback }: { min: number; max: number; fallback: number }): number => {
    const parsed = Number.parseInt(String(raw), 10);
    if (!Number.isFinite(parsed)) {
        return fallback;
    }

    if (parsed < min) return min;
    if (parsed > max) return max;
    return parsed;
};

const decodeCursor = (cursor: string | undefined): CursorPayload | null => {
    if (!cursor) return null;

    try {
        const decoded = Buffer.from(cursor, 'base64').toString('utf8');
        const payload = JSON.parse(decoded);

        if (!payload || typeof payload !== 'object') {
            return null;
        }

        if (!('f' in payload) || !('v' in payload)) {
            return null;
        }

        return payload;
    } catch (error: any) {
        console.warn('[pagination] Failed to decode cursor:', error.message);
        return null;
    }
};

const encodeCursor = (field: string, item: Record<string, unknown> | null): string | null => {
    if (!item || !field) return null;

    const value = item[field];
    if (value === undefined || value === null) {
        return null;
    }

    const payload: CursorPayload = {
        f: field,
        v: value,
        id: (item.id as string | number) || undefined,
    };

    return Buffer.from(JSON.stringify(payload)).toString('base64');
};

const parsePagination = (query: PaginationQuery = {}): ParsedPagination => {
    const limit = clampNumber(query.limit, { min: 1, max: MAX_LIMIT, fallback: DEFAULT_LIMIT });
    const page = clampNumber(query.page, { min: 1, max: Number.MAX_SAFE_INTEGER, fallback: 1 });

    const sortParam = typeof query.sort === 'string' && query.sort.trim() ? query.sort.trim() : '-created_at';
    const sortKey = sortParam.replace(/^-/, '');
    const direction: 'ASC' | 'DESC' = sortParam.startsWith('-') ? 'DESC' : 'ASC';
    const sortField = SORT_FIELD_MAP[sortKey] || 'created_at';

    const cursor = decodeCursor(query.cursor);
    const usingCursor = Boolean(cursor && cursor.f === sortField);

    const primaryOrder: [string, string] = [sortField, direction];
    const secondaryOrder: [string, string] = ['id', direction === 'DESC' ? 'DESC' : 'ASC'];

    return {
        limit,
        page,
        offset: (page - 1) * limit,
        order: [primaryOrder, secondaryOrder],
        sortField,
        sortDirection: direction,
        cursor: usingCursor ? cursor : null,
        rawCursor: usingCursor ? (query.cursor || null) : null,
        usingCursor,
    };
};

const buildCursorClause = ({ cursor, sortField, sortDirection }: { cursor: CursorPayload | null; sortField: string; sortDirection: 'ASC' | 'DESC' }): Record<string, unknown> | null => {
    if (!cursor || !sortField) {
        return null;
    }

    if (cursor.f !== sortField || cursor.v === undefined || cursor.v === null) {
        return null;
    }

    const comparator = sortDirection === 'DESC' ? Op.lt : Op.gt;
    const tieBreaker = sortDirection === 'DESC' ? Op.lt : Op.gt;

    return {
        [Op.or]: [
            { [sortField]: { [comparator]: cursor.v } },
            {
                [Op.and]: [
                    { [sortField]: cursor.v },
                    { id: { [tieBreaker]: cursor.id || 0 } },
                ],
            },
        ],
    };
};

export {
    parsePagination,
    parseBoolean,
    encodeCursor,
    buildCursorClause,
};

// CommonJS compatibility
module.exports = {
    parsePagination,
    parseBoolean,
    encodeCursor,
    buildCursorClause,
};
