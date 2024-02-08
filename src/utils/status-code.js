module.exports = {
  // 2xx Success
  Success: 2000,

  // 4xx Client Errors
  BadRequest: 4001,
  Unauthorized: 4002,
  Forbidden: 4003,
  NotFound: 4004,
  Conflict: 4005,
  ValidationFailed: 4006,

  // 5xx Server Errors
  DatabaseError: 5001,
  DuplicateKey: 5002,
  ForeignKeyViolation: 5003,
  IntegrityConstraintViolation: 5004,
  DataFormatError: 5005,
  TransactionError: 5006,
};
