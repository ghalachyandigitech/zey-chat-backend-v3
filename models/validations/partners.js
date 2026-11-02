const {body, query} = require("express-validator");
const partnerModel = require("../Partner");

const _id = query('_id').isString().notEmpty().custom(async value => { //todo objectId chlini error
    if(!await partnerModel.findOne({_id: value})) throw new Error('partner not found');
});
const userAdminsIds = body('userAdminsIds').isArray();
const name = body('name').isString().isLength({min: 3, max: 32}).notEmpty();
const file = body('file').isInt({min: 0, max: 3}).notEmpty();
const status = body('status').isInt({min: 0, max: 1}).notEmpty();

module.exports = {
    status: [_id, status],
    update: [_id, name, file, userAdminsIds],
    create: [name, file, userAdminsIds],
    delete: [_id],
};