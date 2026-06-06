class HttpError extends Error {
    constructor(status, message, code) {
        super(message);
        this.name = "HttpError";
        this.status = status;
        this.code = code || null;
    }
}

function isHttpError(err) {
    return err instanceof HttpError;
}

module.exports = {
    HttpError,
    isHttpError
};
