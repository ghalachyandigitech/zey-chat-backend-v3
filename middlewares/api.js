const {USER_SUPER_JWT_SECRET_KEY, USER_PARTNER_JWT_SECRET_KEY, USER_JWT_SECRET_KEY} = process.env;
const userPartnerModel = require('../models/UserPartner');
const jwt = require('jsonwebtoken');

exports.userSuperAuth = function(req, res, next){
    try {
        const authorization = req.headers.authorization;
        if(!authorization) return res.status(401).json();

        const accessToken = authorization.split(' ')[1];
        if(!accessToken) return res.status(401).json();

        req.userSuper = jwt.verify(accessToken, USER_SUPER_JWT_SECRET_KEY);
        if(!req.userSuper) return res.status(401).json();
        // const userTokenRow = await usersTokenModel.getByUserId(user.id); todo aveli lav klini lini
        // if(!userTokenRow || userTokenRow.access_token !== accessToken)
        //     return res.status(401).json();

        next();
    }catch (e) {
        return res.status(401).json();
    }
};

exports.userPartnerAuth = async function(req, res, next){
    let accessToken = '';

    try {
        const {authorization} = req.headers;
        if(!authorization) return res.status(401).json();

        accessToken = authorization.split(' ')[1];
        if(!accessToken) return res.status(401).json();

        req.userPartner = jwt.verify(accessToken, USER_PARTNER_JWT_SECRET_KEY);
        // const userTokenRow = await usersTokenModel.getByUserId(user.id); todo aveli lav klini lini
        // if(!userTokenRow || userTokenRow.access_token !== accessToken)
        //     return res.status(401).json();

        next();
    }catch (e) {
        if(e instanceof jwt.TokenExpiredError){
            const {_id} = jwt.decode(accessToken);
            await userPartnerModel.updateOne({status: {$in: [2,3,4]}, _id: _id}, {status: 1})
        }

        return res.status(401).json();
    }
};

exports.userPartnerAdminAuth = function(req, res, next){
    const {role} = req.userPartner;
    if(role === 1){
        next();
    }else{
        return res.status(403).json();
    }
};

exports.userPartnerAgentAuth = function(req, res, next){
    const {role} = req.userPartner;
    if([2,3].includes(role)){
        next();
    }else{
        return res.status(403).json();
    }
};

exports.userPartnerTeamLeadAuth = function(req, res, next){
    const {role} = req.userPartner;
    if([1,2].includes(role)){
        next();
    }else{
        return res.status(403).json();
    }
};

exports.userAuth = async function(req, res, next){
    try {
        const authorization = req.headers.authorization;
        if(!authorization) return res.status(401).json();

        const accessToken = authorization.split(' ')[1];
        if(!accessToken) return res.status(401).json();

        req.user = jwt.verify(accessToken, USER_JWT_SECRET_KEY);

        // const userTokenRow = await usersTokenModel.getByUserId(user.id); todo aveli lav klini lini
        // if(!userTokenRow || userTokenRow.access_token !== accessToken)
        //     return res.status(401).json();

        next();
    }catch (e) {
        return res.status(401).json();
    }
};