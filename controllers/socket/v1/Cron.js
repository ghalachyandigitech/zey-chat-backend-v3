const userPartnerModel = require('../../../models/UserPartner');
const ipModel = require('../../../models/redis/ipModel');
const {setClientTasksErrors} = require('../../../core/MeiliSearch');
const autoAnswerModel = require('../../../models/redis/autoAnswerModel');
const meiliSearchModel = require('../../../models/redis/meiliSearchModel');
const AUTO_ANSWER_TIMEOUT = parseInt(process.env.AUTO_ANSWER_TIMEOUT);
const VISITORS_DISCONNECTED_TIMEOUT = parseInt(process.env.VISITORS_DISCONNECTED_TIMEOUT);
const AGENTS_DISCONNECTED_TIMEOUT_FOR_STATUS = parseInt(process.env.AGENTS_DISCONNECTED_TIMEOUT_FOR_STATUS);
const AGENTS_DISCONNECTED_TIMEOUT_FOR_LOGOUT = parseInt(process.env.AGENTS_DISCONNECTED_TIMEOUT_FOR_LOGOUT);
const CRON_AUTO_ANSWER_INTERVAL = parseInt(process.env.CRON_AUTO_ANSWER_INTERVAL);
const IP_ADDRESSES_CACHE_TIMEOUT = parseInt(process.env.IP_ADDRESSES_CACHE_TIMEOUT);

exports.ipCron = async function(){
    const ipAddresses = await ipModel.getIpAddresses();
    if(ipAddresses.length){
        ipAddresses.forEach(async (ipAddress) => {
            const date = await ipModel.getIpAddressDate(ipAddress);

            if(date + IP_ADDRESSES_CACHE_TIMEOUT < Date.now()){
                await ipModel.deleteIpAddress(ipAddress);
            }
        })
    }
};

exports.partnerCron = function(partner, setAutoAnswer, agentsLogout){
    this.disconnectVisitors = function(){
        partner.users['disconnected-visitors'].forEach(async (user, userId) => {
            if(user['disconnected'] + VISITORS_DISCONNECTED_TIMEOUT < Date.now()){
                await userPartnerModel.updateOne({_id: userId}, {$inc: {'visits': 1}});

                partner.users['disconnected-visitors'].delete(userId);
            }
        });
    };

    this.disconnectAgents = function(){
        partner.users['disconnected-agents'].forEach(async (user, userId) => {
            if(user['status'] !== 2 && user['disconnected'] + AGENTS_DISCONNECTED_TIMEOUT_FOR_STATUS < Date.now()){
                await userPartnerModel.updateOne({partnerId: partner.id, _id: userId}, {status: 2, views: []});
                partner.updateAgent(userId, {status: 2});
                partner.io.to(partner.id).emit('agents.update.status', [userId, 2, user.name, user.role]);
            }else if(user['disconnected'] + AGENTS_DISCONNECTED_TIMEOUT_FOR_LOGOUT < Date.now()){
                agentsLogout(userId, 1);
            }
        });
    };

    this.meiliSearchTasks = async function(){
        const tasksUids = await meiliSearchModel.getPartnerTasks(partner.id);
        if(tasksUids.length) await setClientTasksErrors(tasksUids);
        meiliSearchModel.deletePartnerTask(partner.id);
    };

    this.autoAnswer = async function(){
        const date = Date.now();

        for(const chatId of await autoAnswerModel.getAutoAnswers(partner.id)){
            const [seconds, lastUserId, status] = await autoAnswerModel.getAutoAnswer(chatId);
            if(isNaN(seconds)) continue;

            await autoAnswerModel.setCronAutoAnswerChatId(chatId);

            if(date + AUTO_ANSWER_TIMEOUT - seconds > Date.now()){
                await autoAnswerModel.updateAutoAnswerDate(chatId, CRON_AUTO_ANSWER_INTERVAL);
            }else{
                await setAutoAnswer(chatId, status, lastUserId);
            }

            await autoAnswerModel.deleteCronAutoAnswerChatId();
        }
    }
};