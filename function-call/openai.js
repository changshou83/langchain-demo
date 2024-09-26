// 1. 创建工具函数
// This is the function that we want the model to be able to call
const getDeliveryDate = async (orderId) => {
  const connection = await createConnection({
    host: "localhost",
    user: "root",
    // ...
  });
};

// 2. 将工具函数加入到调用工具列表并将其加入到模型调用中
const tools = [
  {
    type: "function",
    function: {
      name: "get_delivery_date",
      description:
        "Get the delivery date for a customer's order. Call this whenever you need to know the delivery date, for example when a customer asks 'Where is my package'",
      parameters: {
        type: "object",
        properties: {
          order_id: {
            type: "string",
            description: "The customer's order ID.",
          },
        },
        required: ["order_id"],
        additionalProperties: false,
      },
    },
  },
];

const messages = [];
messages.push({
  role: "system",
  content:
    "You are a helpful customer support assistant. Use the supplied tools to assist the user.",
});
messages.push({
  role: "user",
  content: "Hi, can you tell me the delivery date for my order?",
});
// highlight-start
messages.push({
  role: "assistant",
  content:
    "Hi there! I can help with that. Can you please provide your order ID?",
});
messages.push({ role: "user", content: "i think it is order_12345" });
// highlight-end

const response = await client.chat.completions.create({
  model: "gpt-4o",
  messages: messages,
  tools: tools,
});

// 3. 使用生成的参数来调用适当的工具调用
// Extract the arguments for get_delivery_date
// Note this code assumes we have already determined that the model generated a function call. See below for a more production ready example that shows how to check if the model generated a function call
const toolCall = response.choices[0].message.tool_calls[0];
const arguments = JSON.parse(toolCall.function.arguments);

const order_id = arguments.order_id;

// Call the get_delivery_date function with the extracted order_id
const delivery_date = getDeliveryDate(order_id);

// 4. 将调用结果传回模型生成最终的答案
// Create a message containing the result of the function call
const function_call_result_message = {
  role: "tool",
  content: JSON.stringify({
    order_id: order_id,
    delivery_date: delivery_date.format("YYYY-MM-DD HH:mm:ss"),
  }),
  tool_call_id: response.choices[0].message.tool_calls[0].id,
};

// Prepare the chat completion call payload
const completion_payload = {
  model: "gpt-4o",
  messages: [
    {
      role: "system",
      content:
        "You are a helpful customer support assistant. Use the supplied tools to assist the user.",
    },
    {
      role: "user",
      content: "Hi, can you tell me the delivery date for my order?",
    },
    {
      role: "assistant",
      content:
        "Hi there! I can help with that. Can you please provide your order ID?",
    },
    { role: "user", content: `i think it is ${order_id}` },
    response.choices[0].message,
    function_call_result_message,
  ],
};

// Call the OpenAI API's chat completions endpoint to send the tool call result back to the model
const final_response = await openai.chat.completions.create({
  model: completion_payload.model,
  messages: completion_payload.messages,
});

// Print the response from the API. In this case it will typically contain a message such as "The delivery date for your order #12345 is xyz. Is there anything else I can help you with?"
console.log(final_response);
