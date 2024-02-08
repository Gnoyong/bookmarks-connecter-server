const statusCode = require('../utils/status-code');

const success = (data, message) => {
  return {message: message ? message : 'ok', code: statusCode.Success, result: data};
};

const faild = (message, error) => {
  return {
    message: message ? message : 'faild', code: statusCode.BadRequest, error,
  };
};

module.exports = {success, faild};
