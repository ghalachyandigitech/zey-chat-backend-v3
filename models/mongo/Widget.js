const {Schema, Types, model} = require('mongoose');

const widgetSchema = new Schema({
    name: { type: String, default: "default" },
    partnerId: { type: Types.ObjectId, ref: "Partner" },
    isRatingEnabled: { type: Boolean, default: true },
    notificationSound: { type: Boolean, default: false },
    offlineGreeting: { type: Boolean },
    greetingMessage: { type: String, default: "" },
    language: { type: String, default: "en" },
    styles: {
        chatBadgeBackgroundColor: { type: String, default: "#FFFFFF" },
        headerLeftColor: { type: String, default: "#4A80F1" },
        headerRightColor: { type: String, default: "#35389F" },
        headerTextColor: { type: String, default: "#FFFFFF" },
        messagesBackgroundColors: { type: Object, default: { client: "#4A80F1", our: "#E2E2E2" } },
        title: { type: String, default: "" },
        botTextColor: { type: String, default: "#8e8e8e" },
        widgetType: { type: String, default: "bar" },
        headerDegree: { type: Number, default: 90 },
        widgetDegree: { type: Number, default: 0 },
        visitorTextColor: { type: String, default: "#0A0A0A" },
        widgetLeftColor: { type: String, default: "#4A80F1" },
        widgetRightColor: { type: String, default: "#35389F" },
        widgetIconColor: { type: String, default: "#FFFFFF" },
        agentTextColor: { type: String, default: "#FFFFFF" },
        widgetGradientType: { type: String, default: "linear-gradient" },
        windowSize: { type: String, default: "overlay" },
        windowSizeMobile: { type: String, default: "overlay" },
        widgetPosition: { type: String, default: "bottom-right" },
        widgetPositionMobile: { type: String, default: "bottom-right" },
        spacingSide: { type: Number, default: 15 },
        spacingSideMobile: { type: Number, default: 10 },
        spacingBottom: { type: Number, default: 15 },
        spacingBottomMobile: { type: Number, default: 10 },
        zIndex: { type: Number, default: 999999 },
        zIndexMobile: { type: Number, default: 999999 },
        notificationColor: { type: String, default: "#07FF00" },
        textareaPlaceholderColor: { type: String, default: "#757575" },
        textareaBorderColor: { type: String, default: "#e2e8f0" },
        typingTextColor: { type: String, default: "#000000" },
        sendButtonBackgroundColor: { type: String, default: "#3b82f6" },
        sendButtonIconColor: { type: String, default: "#ffffff" },
        sendButtonHoverColor: { type: String, default: "#82aaec" },
        fileButtonBackgroundColor: { type: String, default: "#ffffff" },
        fileButtonIconColor: { type: String, default: "#475569" },
        fileButtonHoverColor: { type: String, default: "#f0f0f0" },
        typingAnimationColor: { type: String, default: "#95a4b9" },
        waitingAgentAnimationColor: { type: String, default: "#95a4b9" },
    }
}, {versionKey: false, timestamps: {createdAt: 'createdAt', updatedAt: 'updatedAt'}});

widgetSchema.statics.getPartnerWidgets = async function (partnerId) {
    const result = {};
    const widgets = await this.find({partnerId: partnerId});

    widgets.forEach(widget => result[widget._id.toString()] = widget);

    return result;
};

module.exports = model('Widget', widgetSchema);