import { ChromaClient } from "chromadb";

const client = new ChromaClient();
const collection = await client.getCollection({ name: "law" });
const result = await collection.query({ queryEmbeddings: [[0.1, 0.2]] });
console.log(result);
