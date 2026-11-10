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

userSchema.statics.createAdmin = async function (email, password, phone, companyName, name, resetToken) {
    const userAdmin = {email, password, phone, companyName, name, resetToken, canBeAdmin: true};
    await this.create(userAdmin);

    return userAdmin;
};

module.exports = model("User", userSchema);