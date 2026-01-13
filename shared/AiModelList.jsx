export default [
  {
    model: "GPTTT",
    icon: "/gpt.png",
    premium: false,
    enable: true,
    subModel: [
      { name: "GPT 3.5 TT", premium: false, id: "openai/gpt-3.5-turbo" },
      { name: "GPT 3.5 Turbo", premium: false, id: "openai/gpt-3.5-turbo-0125" },
      { name: "GPT 4.1 Mini", premium: false, id: "openai/gpt-4o-mini" },
      { name: "GPT 4.1", premium: true, id: "openai/gpt-4o" },
      { name: "GPT 5 Nano", premium: false, id: "openai/gpt-4o-mini-2024-07-18" }, // ইউনিক আইডি
      { name: "GPT 5 Mini", premium: false, id: "openai/gpt-4o-mini:latest" }, // ইউনিক আইডি
      { name: "GPT 5", premium: true, id: "openai/gpt-4o:latest" }, // ইউনিক আইডি
    ],
  },
  {
    model: "Gemini",
    icon: "/gemini.png",
    premium: false,
    enable: true,
    subModel: [
      { name: "Gemini 2.5 Lite", premium: false, id: "openai/gpt-3.5-turbo" },
      { name: "Gemini 2.5 Flash", premium: false, id: "google/gemini-2.0-flash-exp" },
      { name: "Gemini 2.5 Pro", premium: true, id: "google/gemini-pro-1.5" },
    ],
  },
  {
    model: "DeepSeek",
    icon: "/deepseek.png",
    premium: false,
    enable: true,
    subModel: [
      { name: "DeepSeek R1", premium: false, id: "openai/gpt-3.5-turbo" },
      { name: "DeepSeek R1 0528", premium: false, id: "deepseek/deepseek-r1:free" },
    ],
  },
  {
    model: "Mistral",
    icon: "/mistral.png",
    premium: true,
    enable: true,
    subModel: [
      { name: "Mistral Medium 2505", premium: false, id: "mistralai/mistral-medium" },
      { name: "Ministral 3B", premium: false, id: "mistralai/ministral-3b" },
    ],
  },
  {
    model: "Grok",
    icon: "/grok.png",
    premium: true,
    enable: true,
    subModel: [
      { name: "Grok 3 Mini", premium: false, id: "x-ai/grok-2-1212" },
      { name: "Grok 3", premium: false, id: "x-ai/grok-beta" },
    ],
  },
  {
    model: "Cohere",
    icon: "/cohere.png",
    premium: true,
    enable: true,
    subModel: [
      { name: "Cohere Command A", premium: false, id: "cohere/command" },
      { name: "Cohere Command R 08-2024", premium: false, id: "cohere/command-r-08-2024" },
    ],
  },
  {
    model: "Llama",
    icon: "/llama.png",
    premium: true,
    enable: true,
    subModel: [
      { name: "Llama 3.3 70B Instruct", premium: false, id: "meta-llama/llama-3.3-70b-instruct" },
      { name: "Llama 4 Scout 17B 16E Instruct", premium: true, id: "meta-llama/llama-3.1-405b" },
    ],
  },
];