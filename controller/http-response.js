const success = (data, message) => {
    return { message: message ? message : "ok", result: data }
};

const faild = (message) => {
    return {
        message: message ? message : "faild"
    }
};

module.exports = { success, faild };