const chatModel = require('../../../models/mongo/Chat');
const {getPartnerChats} = require('../../../core/MeiliSearch');
const userPartnerModel = require('../../../models/mongo/UserPartner');
const {deleteFile} = require('../../../helpers/fileHelper');
const chatMessageModel = require('../../../models/mongo/ChatMessage');
const {validationResult} = require('express-validator');

exports.deleteFile = async function(req, res){
    const {messageId} = req.query;

    const message = await chatMessageModel.findOne({_id: messageId});
    if (message.file) {
        const fileName = message.file.split('/').pop();
        await deleteFile('video', fileName);
        await deleteFile("image", fileName);
    }

    await chatMessageModel.updateOne({_id: messageId}, {file: ''});

    return res.json();
};

exports.transcript = async function(req, res){
    const [rating, logs, createdAt] = await chatModel.getChatById(req.query._id);

    return res.json({
        rating: rating,
        logs: logs,
        createdAt: createdAt,
        logUsers: await userPartnerModel.getLogUsers(logs.map(user => user.userId)),
        messages: await chatMessageModel.find({chatId: req.query._id})
    });
};

exports.get = async function(req, res){
    if(!validationResult(req).isEmpty()) return res.status(422).json();

    const {partnerId} = req.userPartner;
    const {dateFrom, dateTo, visitorId, agentName, message, rating, status, page} = req.body;

    let agentsIds = [];
    if(agentName){
        agentsIds = await userPartnerModel.getAgentsIdsByName(partnerId, agentName);
        if(!agentsIds.length) return res.json({data: [], count: 0});
    }

    const chats = await getPartnerChats(partnerId, {
        rating: rating,
        page: page,
        status: status,
        dateFrom: new Date(dateFrom).getTime() || 0,
        dateTo: new Date(dateTo).getTime() || 0,
        text: message,
        visitorName: visitorId,
        agentsIds: agentsIds
    });

    return res.json(chats);
};