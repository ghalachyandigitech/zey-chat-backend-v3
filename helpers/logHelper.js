const fs = require('fs');

exports.setError = function(error){
    try {
        const date = new Date().toLocaleDateString().replaceAll('/', '-');
        const dateTime = new Date();

        const errorString = error.stack ? error.stack.toString(): error.toString();
        // console.log(dateTime + ' Uncaught Exception: =>', errorString);
        fs.appendFileSync(`./logs/${date}_log.txt`, dateTime + ' -- ' + errorString + '\n');
    }catch (e) {
        console.log(e);
        console.log(error);
    }
};