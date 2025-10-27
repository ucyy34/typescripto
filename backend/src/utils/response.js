/**
 * Response Utilities
 * Standardized API response format for frontend integration
 */

/**
 * Success response
 * @param {Object} res - Express response object
 * @param {Object} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code (default: 200)
 */
const success = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 400)
 * @param {Object} errors - Validation errors (optional)
 */
const error = (res, message = 'An error occurred', statusCode = 400, errors = null) => {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
  };

  if (errors) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

/**
 * Created response (201)
 * @param {Object} res - Express response object
 * @param {Object} data - Created resource data
 * @param {string} message - Success message
 */
const created = (res, data = null, message = 'Resource created successfully') => {
  return success(res, data, message, 201);
};

/**
 * No content response (204)
 * @param {Object} res - Express response object
 */
const noContent = (res) => {
  return res.status(204).send();
};

/**
 * Paginated response
 * @param {Object} res - Express response object
 * @param {Array} data - Array of items
 * @param {Object} pagination - Pagination metadata
 */
const paginated = (res, data, pagination = {}, message = 'Success', statusCode = 200) => {
  const page = Number(pagination.page ?? pagination.currentPage ?? 1);
  const limit = Number(pagination.limit ?? pagination.pageSize ?? data.length ?? 0);
  const total = Number(
    pagination.total ?? pagination.totalItems ?? pagination.count ?? data.length ?? 0
  );
  const calculatedTotalPages = limit > 0 ? Math.ceil(total / limit) : 1;
  const totalPages = Number(pagination.totalPages ?? pagination.pages ?? calculatedTotalPages);
  const hasNext =
    typeof pagination.hasNext !== 'undefined' ? pagination.hasNext : page < totalPages;
  const hasPrev =
    typeof pagination.hasPrev !== 'undefined' ? pagination.hasPrev : page > 1;

  const meta = {
    page,
    limit,
    total,
    totalPages,
    hasNext,
    hasPrev,
  };

  if (typeof pagination.cursor !== 'undefined') {
    meta.cursor = pagination.cursor;
  }

  if (typeof pagination.sort !== 'undefined') {
    meta.sort = pagination.sort;
  }

  if (typeof pagination.summary !== 'undefined') {
    meta.summary = pagination.summary;
  }

  return res.status(statusCode).json({
    success: true,
    message,
    data,
    pagination: meta,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Unauthorized response (401)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
const unauthorized = (res, message = 'Unauthorized access') => {
  return error(res, message, 401);
};

/**
 * Forbidden response (403)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
const forbidden = (res, message = 'Forbidden access') => {
  return error(res, message, 403);
};

/**
 * Not found response (404)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
const notFound = (res, message = 'Resource not found') => {
  return error(res, message, 404);
};

/**
 * Validation error response (422)
 * @param {Object} res - Express response object
 * @param {Object} errors - Validation errors
 * @param {string} message - Error message
 */
const validationError = (res, errors, message = 'Validation failed') => {
  return error(res, message, 422, errors);
};

/**
 * Internal server error response (500)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
const serverError = (res, message = 'Internal server error') => {
  return error(res, message, 500);
};

module.exports = {
  success,
  error,
  created,
  noContent,
  paginated,
  unauthorized,
  forbidden,
  notFound,
  validationError,
  serverError,
};
