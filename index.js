import { ChatOpenAI } from "@langchain/openai";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { config } from "dotenv";

config();

const model = new ChatOpenAI(
  {
    model: "qwen-max",
    apiKey: process.env.DASHSCOPE_API_KEY,
  },
  {
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  }
);
const parser = new StringOutputParser();
const systemTemplate = "Translate the following into {language}";
const promptTemplate = ChatPromptTemplate.fromMessages([
  ["system", systemTemplate],
  ["user", "{text}"],
]);

const chain = promptTemplate.pipe(model).pipe(parser);
const result = await chain.invoke({ language: "chinese", text: "hi" });
console.log(result);
