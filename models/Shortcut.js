const {Schema, model, Types} = require('mongoose');

const shortcutSchema = new Schema({
        partnerId: {type: Types.ObjectId, ref: 'Partner'},
        tag: { type: String },
        message: { type: String },
        options: [{ type: String }]
    }, {versionKey: false, timestamps: {createdAt: false, updatedAt: false}}
);

module.exports = model('Shortcut', shortcutSchema);