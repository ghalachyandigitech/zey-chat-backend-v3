const {response} = require('express');
const {json} = response;

response.json = function (payload) {
    if(this.statusCode >= 400){
        return json.call(this, {
            error: payload
        })
    }else{
        return json.call(this, {
            payload
        });
    }
};