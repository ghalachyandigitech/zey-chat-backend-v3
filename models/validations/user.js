const {body} = require("express-validator");

const email = body('email').isEmail().normalizeEmail().notEmpty();
const password = body('password').isLength({min: 6, max: 32}).notEmpty();
const confirmPassword = body('confirmPassword').custom(async (value, {req}) => {
    if(req.body.password !== value) throw new Error('confirm password does not match password');
});

module.exports = {
    create: [email],
    update: [email],
    forgotPassword: [email],
    createPassword: [password, confirmPassword],
    login: [email, password]
};