const shortcutModel = require('../../../models/mongo/Shortcut');
const {validationResult} = require('express-validator');

exports.getAgents = async function(req, res){
    const {partnerId} = req.userPartner;

    return res.json(await shortcutModel.find({partnerId}));
};

exports.get = async function(req, res){
    const {partnerId} = req.userPartner;

    return res.json(await shortcutModel.find({partnerId}).select('_id tag message'));
};

exports.create = async function(req, res){
    if(!validationResult(req).isEmpty()) return res.status(422).json();

    const {partnerId} = req.userPartner;

    return res.json(await shortcutModel.create({partnerId: partnerId, tag: req.body.tag, message: req.body.message}));
};

exports.delete = async function(req, res){
    if(!validationResult(req).isEmpty()) return res.status(422).json();

    const {partnerId} = req.userPartner;

    await shortcutModel.findOneAndDelete({_id: req.query._id, partnerId: partnerId});

    return res.json();
};

exports.update = async function(req, res){
    if(!validationResult(req).isEmpty()) return res.status(422).json();

    const {partnerId} = req.userPartner;
    const {_id, tag, message} = req.body;

    await shortcutModel.updateOne({partnerId: partnerId,  _id: _id}, {tag: tag, message: message});

    return res.json(req.body);
};