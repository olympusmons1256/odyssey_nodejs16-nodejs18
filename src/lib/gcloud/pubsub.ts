import {PubSub, Topic} from "@google-cloud/pubsub";

// Idempotent topic creation
async function createTopic(pubsub: PubSub, topicName: string) : Promise<Topic | undefined> {
  try {
    console.log("Creating pubsub topic: ", topicName);
    const [topic] = await pubsub.createTopic(topicName);
    return topic;
  } catch (e : any) {
    if (e.code as number == 6) {
      console.log("Topic already exists");
      return Promise.resolve(new Topic(pubsub, topicName));
    } else {
      return Promise.resolve(undefined);
    }
  }
}

export async function publishMessage(projectId: string, topicName : string, data: Buffer, attributes?: any) {
  const pubsub = new PubSub({projectId});
  const topic = await createTopic(pubsub, topicName);
  if (topic === undefined) {
    const errorMsg = "Unable to create topic: " + topicName;
    console.log(errorMsg);
    throw new Error(errorMsg);
  }
  return topic.publish(data, attributes);
}
