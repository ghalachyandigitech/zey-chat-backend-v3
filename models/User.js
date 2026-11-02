const {Schema, model } = require('mongoose');

const userSchema = new Schema({
    name: {type: String},
    canBeAdmin: {type: Boolean},
    email: {type: String},
    phone: {type: String},
    companyName: {type: String},
    resetToken: {type: String},
    password: {type: String},
}, {versionKey: false, timestamps: {createdAt:'createdAt', updatedAt:'updatedAt'}});

userSchema.statics.updateAdmin = async function(_id, data) {
    return await this.updateOne({_id, canBeAdmin: true}, data);
};

module.exports = model("User", userSchema);