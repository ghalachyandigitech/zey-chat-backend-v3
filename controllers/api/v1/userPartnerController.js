const {validationResult} = require('express-validator');
const userPartnerModel = require('../../../models/mongo/UserPartner');
const partnerModel = require('../../../models/mongo/Partner');
const userModel = require('../../../models/mongo/User');
const shortcutModel = require('../../../models/mongo/Shortcut');
const chatModel = require('../../../models/mongo/Chat');
const {saveBuffer, deleteFile} = require('../../../helpers/fileHelper');

exports.signIn = async function(req, res){
    const {userId, _id, partnerId} = req.userPartner;

    const [user, userPartner, partner, shortcuts] = await Promise.all([
        userModel.findOne({_id: userId}).select('email'),
        userPartnerModel.findOne({_id: _id}).select('role name profileImage messageFlag requestFlag'),
        partnerModel.findOne({_id: partnerId}).select('name dashboardImage request'),
        shortcutModel.find({partnerId: partnerId}).select('tag message'),
    ]);

    return res.json({
        userEmail: user.email,
        shortcuts: shortcuts.map(({tag, message}) => ({tag: tag, message: message})),
        partner,
        userPartner
    });
};

exports.get = async function(req, res){
    const {_id} = req.user;
    const userPartners = await userPartnerModel.getUserPartnersIndexed(_id);

    return res.json({
        userPartners: userPartners,
        partners: await partnerModel.getPartnersIndexed(Object.values(userPartners).map(u => u.partnerId))
    });
};

exports.updateNote = async function(req, res){
    if(!validationResult(req).isEmpty()) return res.status(422).json();

    await userPartnerModel.findOneAndUpdate({_id: req.query.userPartnerId}, {note: req.body.note});

    return res.json(req.body.note);
};

exports.updateProfileImage = async function(req, res){
    const {files} = req;
    const {_id} = req.userPartner;
    const file = files && files['profile-image'];

    if(!file || !['image/png', 'image/jpg', 'image/jpeg'].includes(file.mimetype))
        return res.status(422).json();

    //todo file error brnel
    const profileImage = await saveBuffer([file.mimetype, file.data]);
    await userPartnerModel.updateOne({_id: _id}, {profileImage: profileImage});

    return res.json({
        profileImage: profileImage
    });
};

exports.deleteProfileImage = async function(req, res){
    const {_id} = req.userPartner;

    const userPartner = await userPartnerModel.findOne({_id: _id});
    //todo file error brnel
    await deleteFile("image", userPartner.profileImage);

    await userPartnerModel.updateOne({_id: _id}, {profileImage: ''});

    return res.json();
};

exports.update = async function(req, res){
    if(!validationResult(req).isEmpty()) return res.status(422).json();

    const {_id} = req.userPartner;
    const {name, email} = req.body;

    const userPartner = await userPartnerModel.findOneAndUpdate({_id: _id}, {name: name});
    await userModel.updateOne({_id: userPartner.userId}, {email: email}); //todo ete update emailic arden unenq

    return res.json(req.body);
};

exports.getVisitor = async function(req, res){
    const {partnerId} = req.userPartner;
    const {userPartnerId} = req.query;

    return res.json({
        userPartner: await userPartnerModel.findOne({_id: userPartnerId, partnerId}),
        chatsPast: await chatModel.getPastChats(partnerId, userPartnerId)
    });
};

exports.updateNotifications = async function(req, res){
    if(!validationResult(req).isEmpty()) return res.status(422).json();

    const {_id} = req.userPartner;
    const {flagName, flagValue} = req.body;

    if(flagName === 'messageFlag')
        await userPartnerModel.updateOne({_id: _id}, {messageFlag: flagValue});
    else if(flagName === 'requestFlag')
        await userPartnerModel.updateOne({_id: _id}, {requestFlag: flagValue});

    return res.json(req.body);
};

exports.getAgents = async function(req, res){
    const {partnerId} = req.userPartner;

    return res.json({agents: await userPartnerModel.getAgents(partnerId)});
};

exports.createAgents = async function(req, res){
    if(!validationResult(req).isEmpty()) return res.status(422).json();

    const {partnerId} = req.userPartner;
    const {email, role, limit, name} = req.body;

    let user = await userModel.findOne({email});
    if(!user) {
        user = await userModel.create({email, password: Math.random().toString()});
        // sendEmail(user._id, email, user.password);
    }else{
        if(await userPartnerModel.findOne({userId: user._id, role: 1}))
            return res.status(422).json('this email is admin');
        if(await userPartnerModel.findOne({partnerId, userId: user._id}))
            return res.status(422).json('partner has user with this email');
    }

    return res.json({
        ...await userPartnerModel.createAgent(partnerId, user._id, {role, limit, name}),
        email: email
    });
};

exports.adminsUpdateAgents = async function(req, res){
    if(!validationResult(req).isEmpty()) return res.status(422).json();

    const {partnerId} = req.userPartner;
    const {userPartnerId, email, name, limit, role} = req.body;
    const agent = {name: name, limit: limit, role: role};

    if(!await userModel.findOne({email})){
        const {_id} = await userModel.create({email, password: Math.random().toString()});
        // sendEmail(userId, email, password);
        agent.userId = _id;
    }

    await userPartnerModel.updateOne({_id: userPartnerId, partnerId: partnerId}, agent);

    return res.json(req.body);
};

exports.teamLeadsUpdateAgents = async function(req, res){
    if(!validationResult(req).isEmpty()) return res.status(422).json();

    const {partnerId} = req.userPartner;
    const {userPartnerId, name, limit} = req.body;

    await userPartnerModel.updateOne({_id: userPartnerId, partnerId: partnerId}, {name, limit});

    return res.json(req.body);
};

exports.deleteAgents = async function(req, res){
    const {partnerId} = req.userPartner;

    const userPartner = await userPartnerModel.findOneAndDelete({_id: req.query.userPartnerId, partnerId: partnerId});
    if(!await userPartnerModel.findOne({userId: userPartner.userId})) //todo harcnel
        await userModel.findByIdAndDelete(userPartner.userId);

    return res.json();
};