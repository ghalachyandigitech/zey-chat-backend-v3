const { Types, model, Schema } = require('mongoose');
const PAGE_MESSAGES_LIMIT = parseInt(process.env.PAGE_MESSAGES_LIMIT);

const chatMessageSchema = new Schema({
    id: {type: Number},
    chatId: {type: Types.ObjectId, ref: 'Chat'},
    userId: {type: Types.ObjectId, ref: 'UserPartner'},
    message: {type: String},
    file: {type: String},
    date: {type: Date}
}, {versionKey: false, timestamps: {createdAt: false, updatedAt: false}});

chatMessageSchema.statics.setMessages = async function(partnerId, chatId, messagesRange){
    const messages = [];
    const messagesTexts = [];

    for(let i = 0; i < messagesRange.length; i+= 5){
        const message = {
            chatId: chatId,
            id: messagesRange[i],
            message: messagesRange[i+2],
            file: messagesRange[i+3],
            date: messagesRange[i+4],
        };

        if(messagesRange[i+1]){
            messagesTexts.push(messagesRange[i+2]);
            message.userId = new Types.ObjectId(messagesRange[i+1]);
        }

        messages.push(message);
    }

    await this.insertMany(messages);

    return messagesTexts;
};

chatMessageSchema.statics.getMessageRange = async function(chatId, offsetId) {
    let ended = 0;

    const model = { chatId: chatId };
    if(offsetId) model.id = { $lt: offsetId };
    const messages = await this.find(model, '-_id id userId message file date').sort({id: -1}).limit(PAGE_MESSAGES_LIMIT + 1) || [];

    if(messages.length !== PAGE_MESSAGES_LIMIT + 1) ended = 1;
    else messages.pop();

    return [messages, ended];
};


module.exports = model('Chat_message', chatMessageSchema);
chatMessageSchema.index({message: 'text'});
chatMessageSchema.index({chatId: 1});
module.exports.createIndexes();
