"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishMessage = void 0;
const pubsub_1 = require("@google-cloud/pubsub");
// Idempotent topic creation
async function createTopic(pubsub, topicName) {
    try {
        console.log("Creating pubsub topic: ", topicName);
        const [topic] = await pubsub.createTopic(topicName);
        return topic;
    }
    catch (e) {
        if (e.code == 6) {
            console.log("Topic already exists");
            return Promise.resolve(new pubsub_1.Topic(pubsub, topicName));
        }
        else {
            return Promise.resolve(undefined);
        }
    }
}
async function publishMessage(projectId, topicName, data, attributes) {
    const pubsub = new pubsub_1.PubSub({ projectId });
    const topic = await createTopic(pubsub, topicName);
    if (topic === undefined) {
        const errorMsg = "Unable to create topic: " + topicName;
        console.log(errorMsg);
        throw new Error(errorMsg);
    }
    return topic.publish(data, attributes);
}
exports.publishMessage = publishMessage;
//# sourceMappingURL=pubsub.js.map