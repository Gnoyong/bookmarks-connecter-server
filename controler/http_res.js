const success = (message, data) => {
    return { message: message ? message : "ok", data }
};

const faild = (message) => {
    return {
        message: message ? message : "faild"
    }
};

module.exports = { success, faild };