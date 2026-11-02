const crypto = require('crypto');

exports.randomString = function(length = 20){
    return crypto.randomBytes(length).toString('hex');
};

exports.stringToSha256 = function(string){
    return crypto.createHash('sha256').update(string).digest('hex');
};