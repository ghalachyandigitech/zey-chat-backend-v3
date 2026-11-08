const chatModel = require('../../../models/mongo/Chat');
const partnerModel = require('../../../models/mongo/Partner');
const userPartnerModel = require('../../../models/mongo/UserPartner');

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
            model = {banUpdatedAt: new Date(), banExpire: new Date(Date.now() + time * 24 * 60 * 60 * 1000), banReason: banReason};
        }else{
            model = {$unset: {banExpire: '', banUpdatedAt: ''}};
        }

        await userPartnerModel.updateOne({_id: userPartnerId}, model);

        partner.io.to(partner.id).emit('permission.ban.set', [model.banUpdatedAt, userPartnerId, banReason]);
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