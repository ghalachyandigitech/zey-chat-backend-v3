const {body, query} = require("express-validator");
const {Types} = require("mongoose");

const _id = query('_id').isString().notEmpty().custom(value => {
    if(Types.ObjectId.isValid(value)) return true;

    throw new Error('not correct _id');
});
const tag = body('tag').isString().isLength({min: 3, max: 64}).notEmpty();
const message = body('message').isString().notEmpty();

module.exports = {
    create: [tag, message],
    update: [_id, tag, message],
    delete: [_id],
};