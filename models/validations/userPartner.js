const userModel = require("../User");
const userPartnerModel = require("../UserPartner");
const {body, query} = require("express-validator");

const _id = query('_id').isString().notEmpty().custom(async value => { //todo objectId chlini error a???
    if(!await userModel.findOne({_id: value})) throw new Error('user not found');
});
const userPartnerId = query('userPartnerId').isString().notEmpty().custom(async (value, {req}) => {
    const {partnerId} = req.userPartner;

    if(!await userPartnerModel.findOne({_id: value, partnerId: partnerId})) throw new Error('user not found');
});
const name = body('name').isString().isLength({min: 3, max: 32}).notEmpty();
const companyName = body('companyName').isString().isLength({min: 3, max: 32}).notEmpty();
const email = body('email').isEmail().normalizeEmail().notEmpty();
const phone = body('phone').isNumeric().notEmpty();
const role = body('role').isInt({min: 2, max: 3}).notEmpty();
const updateRole = body('role').optional().isInt({min: 2, max: 3});
const limit = body('limit').isInt({min: 1, max: 10}).notEmpty();
const status = body('status').isInt({min: 0, max: 1}).notEmpty();
const loginStatus = body('status').isInt({min: 2, max: 4}).notEmpty();
const flagName = body('flagName').isIn(['messageFlag','requestFlag']).notEmpty();
const flagValue = body('flagValue').isInt({min: 0, max: 1}).notEmpty();
const note = body('note').isString();

module.exports = {
    createAdmin: [name, companyName, email, phone],
    updateAdmin: [name, companyName, email, phone],
    deleteAdmin: [_id],
    createAgent: [name, role, limit],
    teamLeadsUpdateAgent: [userPartnerId, name, limit],
    adminsUpdateAgent: [userPartnerId, name, updateRole, limit],
    deleteAgent: [userPartnerId],
    updateStatus: [userPartnerId, status],
    loginStatus: [loginStatus],
    updateProfile: [name],
    updateNote: [userPartnerId, note],
    updateNotifications: [flagName, flagValue]
};