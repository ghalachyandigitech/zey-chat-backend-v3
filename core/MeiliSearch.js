const {MeiliSearch} = require('meilisearch');
const meiliSearchModel = require('../models/redis/meiliSearchModel');
const {setError} = require('../helpers/logHelper');

let client;

module.exports = {
    async connect(url, apiKey){
        client = new MeiliSearch({
            host: url,
            apiKey: apiKey
        });
    },

    async setClientTasksErrors(tasksUids){
        const {results} = await client.tasks.getTasks({uids: tasksUids});

        results && results.forEach(({error}) => error && setError(error.message));
    },

    async createPartnerChatsIndex(partnerId){
        const index = await client.index(`${partnerId}_chats`);
        await index.updateSettings({
            displayedAttributes: ['_id', 'rating', 'createdAt', 'visitorName', 'agentsNames', 'visitorId'],
            filterableAttributes: ['_id', 'status', 'rating', 'createdAt', 'visitorName', 'agentsIds', 'agentsNames', 'visitorId'],
            searchableAttributes: ['messages'],
            sortableAttributes: ['createdAt']
        });
    },

    async updatePartnerChatRating(partnerId, chatId, rating){
        const index = await client.index(`${partnerId}_chats`);
        await index.updateDocuments([{
            _id: chatId,
            rating: rating
        }]);
    },

    async setPartnerChat(partnerId, chat){
        const index = await client.index(`${partnerId}_chats`);

        const {taskUid} = await index.addDocuments([chat], {primaryKey: '_id'});
        await meiliSearchModel.setPartnerTaskUid(partnerId, taskUid);
    },

    async getPartnerChats(partnerId, {rating, page, status, dateFrom, dateTo, text, visitorName, agentsIds}){
        const limit = 10;
        const offset = (page-1)*limit;

        const index = client.index(`${partnerId}_chats`);
console.log(partnerId);
        const filter = [];
        // agentsIds.length && filter.push(`agentsIds IN [${agentsIds.join(',')}]`);
        // visitorName && filter.push(`visitorName = ${visitorName}`);
        // status && filter.push(`status = ${status}`);
        // rating && filter.push(`rating = ${rating}`);
        // dateFrom && filter.push(`createdAt >= ${dateFrom}`) && dateTo && filter.push(`createdAt < ${dateTo}`);
console.log(filter);
        const {hits, estimatedTotalHits} = await index.search(text, {filter: filter.join(' AND '), limit, offset, sort: ['createdAt:desc']});
        return {data: hits, count: estimatedTotalHits};
    }
};