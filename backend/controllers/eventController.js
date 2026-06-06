const { getRegisterableEvents } = require("../utils/eventAccess");
const { isHttpError } = require("../utils/httpError");

function handleControllerError(res, err) {
    if (isHttpError(err))
        return res.status(err.status).json({ error: err.message, code: err.code });

    res.status(500).json({ error: err.message });
}

// GET /events/open
// Returns events that are open for student self-registration.
exports.getOpenEvents = async (req, res) => {
    try {
        const events = await getRegisterableEvents();

        res.json(events);

    } catch (err) {
        handleControllerError(res, err);
    }
};
