import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { config } from "dotenv";

config();

async function getVectorStore(type = "memory") {
  // load docs
  const loader = new CheerioWebBaseLoader(
    "https://www.gov.cn/jrzg/2013-10/25/content_2515601.htm",
    {
      selector: ".p1",
    }
  );
  const docs = await loader.load();
  // split text
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  const splits = await textSplitter.splitDocuments(docs);
  // create vector store
  const embeddings = new OpenAIEmbeddings(
    { model: "text-embedding-3-small", apiKey: process.env.OPENAI_API_KEY },
    { baseURL: process.env.OPENAI_API_BASE }
  );
  let vectorStore;
  if (type === "memory") {
    vectorStore = await MemoryVectorStore.fromDocuments(splits, embeddings);
    return vectorStore;
  } else if (type === "chroma") {
    const opt = {
      url: "http://localhost:8000",
      collectionName: "law",
    };
    try {
      await Chroma.fromDocuments(splits, embeddings, opt);
      return new Chroma(embeddings, opt);
    } catch (error) {
      console.error("在docker里面开chromadb了吗？");
    }
  }
}

async function getRAGChain() {
  const promptTemplateStr = `
  You are an assistant for question-answering tasks. Use the following pieces of retrieved context to answer the question. If you don't know the answer, just say that you don't know. Use three sentences maximum and keep the answer concise. think step by step before give the final answer
  
  Question: {question}
  
  Context: {context}
  
  Answer:
  `;
  const promptTemplate = ChatPromptTemplate.fromTemplate(promptTemplateStr);
  const llm = new ChatOpenAI(
    {
      model: "gpt-3.5-turbo",
      apiKey: process.env.OPENAI_API_KEY,
      temperature: 0,
    },
    {
      baseURL: process.env.OPENAI_API_BASE,
    }
  );
  return promptTemplate.pipe(llm).pipe(new StringOutputParser());
}

async function main() {
  const ragChain = getRAGChain();
  const [question = ""] = process.argv.slice(2);
  const vectorStore = await getVectorStore("memory");
  const retriever = vectorStore.asRetriever({
    k: 2,
    searchType: "similarity",
  });

  const result = await ragChain.invoke({
    question,
    context: retriever.pipe(formatDocs),
  });
  console.log(result);

  function formatDocs(docs) {
    return docs.map((doc) => doc.pageContent).join("\n\n");
  }
}

await main();
