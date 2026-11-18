const nodemailer = require("nodemailer");
const {SMTP_USER, CREATE_PASSWORD_URL, SMTP_HOST, SMTP_PORT, SMTP_PASSWORD} = process.env;

const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    auth: {
        user: SMTP_USER,
        pass: SMTP_PASSWORD,
    },
});

exports.sendCreatePasswordEmail = (email, resetToken) => {
    //todo karox reset i hamar subject tanq created i poxaren
    return console.log(CREATE_PASSWORD_URL.replace('{{RESET_TOKEN}}', resetToken));
    return new Promise(async (resolve, reject) => {
        try {
            const message = {
                from: SMTP_USER,
                to: 'Arthur.Ghalachyan@digitecham.com',
                subject: "Create new account",
                text: "Zeychat",
                html: `
                    <p>Dear User,
                    <br/>Your account in Zeychat was successfully created.
                    <br/>To set your password, click on the button below:<br/>
                    <a style="background: #103d54 color: #fff padding: 8px 16px text-decoration: none border-radius: 4px display: inline-block margin: 12px 0" href="${CREATE_PASSWORD_URL.replace('{{RESET_TOKEN}}', resetToken)}" target="_blank">create password</a><br/>
                    <img src="cid:logo" width="100"/></p>`,
            };

            await transporter.sendMail(message);
            resolve(true);
        } catch (error) {
            console.error(error);
            reject(false);
        }
    });
}