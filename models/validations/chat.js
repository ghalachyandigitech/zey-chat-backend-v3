const {body} = require("express-validator");

module.exports = {
    get: [
        body('dateFrom').isString().isISO8601().notEmpty(),
        body('dateTo').isString().isISO8601().notEmpty(),
        body('page').isInt({min: 1}).notEmpty(),
        body('status').isIn([0,5,6]).notEmpty(),
        body('rating').isInt({min: 0, max: 5}).notEmpty(),
        body('visitorId').isString({min: 1, max: 32}),
        body('agentName').isString({min: 1, max: 32}),
        body('message').isString({min: 1, max: 32})
    ],
};