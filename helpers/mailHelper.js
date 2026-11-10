export function sendUserAdminPassword(email, resetToken){
    //todo karox reset i hamar subject tanq created i poxaren
    return true;
    return new Promise(async (resolve, reject) => {
        try {
            const message = {
                from: SMTP_USER,
                to: email,
                subject: "Create new account",
                text: "Zeychat",
                html: `
                    <p>Dear User,
                    <br/>Your account in Zeychat was successfully created.
                    <br/>To set your password, click on the button below:<br/>
                    <a style="background: #103d54 color: #fff padding: 8px 16px text-decoration: none border-radius: 4px display: inline-block margin: 12px 0" href="${APP_ZEYCHAT_URL}/confirm-password?t=${resetToken}" target="_blank">Create password</a><br/>
                    <img src="cid:logo" width="100"/></p>`,
                attachments
            };

            await transporter.sendMail(message);
            resolve(true);
        } catch (error) {
            console.error(error);
            reject(false);
        }
    });
}