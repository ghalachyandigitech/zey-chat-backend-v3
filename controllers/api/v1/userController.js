const {sendUserAdminPassword} = require('../../../helpers/mailHelper');
const {logoutPartnerAgents} = require('../../../core/Io');
const {randomString, stringToSha256} = require('../../../helpers/stringHelper');
const userModel = require("../../../models/mongo/User");
const userPartnerModel = require("../../../models/mongo/UserPartner");
const partnerModel = require("../../../models/mongo/Partner");
const jwt = require('jsonwebtoken');
const {validationResult} = require('express-validator');
const {USER_JWT_SECRET_KEY, USER_JWT_EXPIRE_IN, USER_PARTNER_JWT_SECRET_KEY, USER_PARTNER_JWT_EXPIRE_IN} = process.env;

exports.userPartnerLogin = async function(req, res){
    if(!validationResult(req).isEmpty()) return res.status(422).json();

    const {_id} = req.user;
    const {status, key} = req.body;

    const partner = await partnerModel.findOne({key: key});
    if(!partner) return res.status(422).json();

    const userPartner = await userPartnerModel.findOne({userId: _id, partnerId: partner.id});
    if(!userPartner) return res.status(422).json();

    await userPartnerModel.updateOne({_id: userPartner._id}, {status: status});

    return res.json({
        accessToken: jwt.sign({
            userId: _id,
            _id: userPartner._id,
            partnerId: partner.id,
            role: userPartner.role,
        }, USER_PARTNER_JWT_SECRET_KEY, {expiresIn: USER_PARTNER_JWT_EXPIRE_IN})
    });
};

exports.logout = async function(req, res){
    const {_id} = req.user;

    const userPartners = await userPartnerModel.find({userId: _id});

    userPartners.forEach(({_id, partnerId}) => {logoutPartnerAgents(partnerId.toString(), _id.toString())});

    return res.json();
};

exports.login = async function(req, res){
    if(!validationResult(req).isEmpty()) return res.status(422).json();

    const {email, password} = req.body;

    const user = await userModel.findOne({email: email.toLowerCase()});
    if(!user || user.password !== stringToSha256(password))
        return res.status(422).json('email or password is wrong');

    return res.json({
        accessToken: jwt.sign({_id: user._id, email}, USER_JWT_SECRET_KEY, {expiresIn: USER_JWT_EXPIRE_IN}),
        user: {_id: user._id, email}
    });
};

exports.createPassword = async function(req, res){
    const {password, token} = req.body;
    if(!token) return res.status(422).json('token expire');

    const user = await userModel.findOne({resetToken: token});
    if(!user) return res.status(422).json('token expire');

    await userModel.updateOne({_id: user._id}, {password: stringToSha256(password), resetToken: ""});

    return res.json({
        accessToken: jwt.sign({_id: user._id, email: user.email}, USER_JWT_SECRET_KEY, {expiresIn: USER_JWT_EXPIRE_IN}),
        user: {_id: user._id, email: user.email}
    });
};

exports.forgotPassword = async function(req, res){
    if(!validationResult(req).isEmpty()) return res.status(422).json();

    const email = req.body.email.toLowerCase();
    const resetToken = randomString(20);

    const {modifiedCount} = await userModel.updateOne({email, role: {$in: [1,2,3]}}, {resetToken});
    if(!modifiedCount) return res.status(422).json('wrong email');

    sendUserAdminPassword(email, resetToken);

    return res.json();
};

exports.getUserAdmins = async function(req, res){
    return res.json({
        userAdmins: await userModel.find({canBeAdmin: true})
    });
};

exports.deleteUserAdmin = async function(req, res){
    if(!validationResult(req).isEmpty()) return res.status(422).json();

    await userPartnerModel.deleteMany({userId: req.query._id, role: 1});
    await userModel.updateOne({_id: req.query._id}, {canBeAdmin: false});

    return res.json();
};

exports.updateUserAdmin = async function(req, res){
    if(!validationResult(req).isEmpty()) return res.status(422).json();

    const {name, companyName, phone} = req.body;
    const email = req.body.email.toLowerCase();
    const _id = req.query._id;

    if(await userModel.findOne({_id: {$ne: _id}, email: email}))
        return res.status(422).json('admin with this email exist');

    const userAdmin = await userModel.findOne({_id: _id}).select('email');
    if(!userAdmin) return res.status(422).json();

    const resetToken = userAdmin.email !== email ? randomString(20) : '';
    await userModel.updateAdmin(_id, {companyName, phone, name, email, resetToken});
    if(resetToken) sendUserAdminPassword(email, resetToken);

    return res.json({
        userAdmin: req.body
    });
};

exports.resetPasswordUserAdmin = async function(req, res){
    if(!validationResult(req).isEmpty()) return res.status(422).json();

    const userAdmin = await userModel.findOne({_id: req.query._id}).select('email');
    if(!userAdmin) return res.status(422).json();

    const resetToken = randomString(20);
    await userModel.updateAdmin(req.query._id, {resetToken});
    sendUserAdminPassword(userAdmin.email, resetToken);

    return res.json();
};

exports.createUserAdmin = async function(req, res){
    if(!validationResult(req).isEmpty()) return res.status(422).json();

    const {name, companyName, phone} = req.body;
    const email = req.body.email.toLowerCase();
    const password = Math.random().toString();
    const resetToken = randomString(20);

    let userAdmin = await userModel.findOne({email: email}).select('_id canBeAdmin');
    if(userAdmin){
        if(userAdmin.canBeAdmin) return res.status(422).json('admin with this email exist');
        await userModel.updateAdmin(userAdmin._id, {canBeAdmin: true, companyName, phone, name, resetToken});
    }else{
        userAdmin = await userModel.createAdmin(email, password, phone, companyName, name, resetToken);
    }

    sendUserAdminPassword(email, resetToken);

    return res.json({
        userAdmin: userAdmin
    });
};

exports.signIn = async function(req, res){
    const {_id} = req.user;
    const {email} = await userModel.findOne({_id});

    return res.json({
        _id: true,
        email: email
    });
};