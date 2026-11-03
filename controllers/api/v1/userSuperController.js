const jwt = require('jsonwebtoken');
const chatModel = require('../../../models/mongo/Chat');
const userModel = require('../../../models/mongo/User');
const partnerModel = require('../../../models/mongo/Partner');
const {USER_SUPER_JWT_SECRET_KEY, USER_SUPER_JWT_EXPIRE_IN} = process.env;

exports.login = async function(req, res){
    if(req.body.username === 'super@test.com' && req.body.password === '123456'){
        return res.json({
            user: {_id: true},
            accessSToken: jwt.sign({role: 0}, USER_SUPER_JWT_SECRET_KEY, {expiresIn: USER_SUPER_JWT_EXPIRE_IN})
        });
    }else{
        return res.status(422).json('username or password is wrong');
    }
};

exports.signIn = async function(req, res){
    return res.json({_id: true});
};

exports.home = async function(req, res){
    return res.json({
        counts: await Promise.all([
            partnerModel.countDocuments(),
            userModel.countDocuments(),
            chatModel.countDocuments(),
        ])
    });
};
