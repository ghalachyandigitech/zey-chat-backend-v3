const chatModel = require('../../../models/Chat');
const partnerModel = require('../../../models/Partner');
const userPartnerModel = require('../../../models/UserPartner');

module.exports = function(partner){
    this.chatFile = async function(chatId){
        const {file} = await chatModel.findOne({_id: chatId});
        if(file > 0){
            const status = 3 - file;
            await chatModel.updateOne({_id: chatId}, {file: status});
            partner.io.to(chatId).emit('permission.file', [status === 2, chatId]);
        }
    };

    this.ban = async function([userPartnerId, time, banReason]){
        if(![0,1,7,1000000].includes(time)) return;

        let model;
        const {banExpire} = await userPartnerModel.findOne({_id: userPartnerId});
        if(!banExpire && time){
            model = {banExpire: new Date(Date.now() + time * 24 * 60 * 60 * 1000), banReason: banReason};
        }else{
            model = {$unset: {banExpire: ''}};
        }

        await userPartnerModel.updateOne({_id: userPartnerId}, model);

        const chatId = partner.users.getParam('visitors', userPartnerId, 'chatId');
        if(chatId){
            partner.emitTo('agents', partner.companionId(chatId, userPartnerId), 'permission.ban.set', [model.banExpire, userPartnerId, banReason])
        }
        partner.io.to('admins').emit('permission.ban.set', [model.banExpire, userPartnerId, banReason]);
        partner.updateVisitor(userPartnerId, {banExpire: model.banExpire});
        partner.emitTo('visitors', userPartnerId, 'permission.ban', !model.banExpire);
    };

    this.setRequest = async function(request){
        request = parseInt(request);
        if(![0,1].includes(request)) return;

        await partnerModel.updateOne({_id: partner.id}, {request: request});
        partner.request = request;
    };
};