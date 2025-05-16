import { FAISS } from "langchain/vectorstores";
import { HuggingFaceEmbeddings } from "langchain/embeddings";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

// Initialize Google AI API
// @ts-ignore
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
const model = genAI.getGenerativeModel({ model: "models/text-embedding-004" });

// Sample knowledge base - this is my personal knowledge base
// In addition, I also use Dr. Ringel's AI RAG loader to upsert additional documents to Pinecone
// So the bot now has access to a vast amount of knowledge about me
const knowledgeBase = [
  {
    id: "1",
    text: "David Nguyen is an AI developer specializing in full-stack applications.",
  },
  {
    id: "2",
    text: "Lumina is an AI chatbot that integrates LLM with RAG & Pinecone for better responses.",
  },
  {
    id: "3",
    text: "David is the creator of Lumina, an AI chatbot that uses the Gemini API.",
  },
  { id: "4", text: "David Nguyen is also known as Son Nguyen Hoang." },
  {
    id: "5",
    text: "David is a software engineer with experience in AI, machine learning, and full-stack development.",
  },
  {
    id: "6",
    text: "Son Nguyen is a results-driven software engineer with expertise in full-stack development, AI/ML, and data analytics.",
  },
  {
    id: "7",
    text: "He has contributed to large-scale projects, including React and Express.js web applications and Django/Python backends.",
  },
  {
    id: "8",
    text: "Son has improved database performance by 30% in multiple projects.",
  },
  {
    id: "9",
    text: "Son enhanced web application security by implementing OAuth 2.0, JWT, and security measures to prevent CSRF and XSS attacks.",
  },
  {
    id: "10",
    text: "At FPT Corporation, Son developed an internal communication platform using Express.js, Node.js, MongoDB, and Kafka.",
  },
  {
    id: "11",
    text: "Son led a 25% increase in team collaboration and reduced communication delays by 30% through internal messaging tools.",
  },
  {
    id: "12",
    text: "At Huong Hua Co., Ltd., Son built an English-version web app and a job application database for over 50,000 active users.",
  },
  {
    id: "13",
    text: "Son’s software development reduced infrastructure costs by 20% and boosted operational efficiency by 40%.",
  },
  {
    id: "14",
    text: "During his internship at VNG Corporation, Son developed a security camera management website using React, Beego, Go, and Oracle DB.",
  },
  {
    id: "15",
    text: "He improved live streaming performance by 30% for security cameras at VNG Corporation.",
  },
  {
    id: "16",
    text: "As a Data Analytics Research Assistant at Case Western Reserve University, Son improved data processing efficiency by 30% using SAS, Python, and R.",
  },
  {
    id: "17",
    text: "Son Nguyen is pursuing a Bachelor's degree in Computer Science and Economics, with a minor in Data Science, at UNC-Chapel Hill.",
  },
  {
    id: "18",
    text: "Son maintains a 3.9/4.0 GPA at UNC-Chapel Hill, expected to graduate in December 2025.",
  },
  {
    id: "19",
    text: "Notable projects by Son include MovieVerse (a web-based movie database with 420,000 monthly visitors) and DocuThinker (an AI-powered document analysis tool).",
  },
  {
    id: "20",
    text: "Son developed Moodify, an AI-powered music app that detects emotions and provides personalized recommendations.",
  },
  {
    id: "21",
    text: "Son has built AI multitask classifiers for object, face, mood, vehicle, flower, and speech recognition using TensorFlow, PyTorch, and Keras.",
  },
  {
    id: "22",
    text: "Son served as a Teaching Assistant for COMP-210 Data Structures at UNC, helping students improve comprehension and exam performance by 20%.",
  },
  {
    id: "23",
    text: "Son is a Teaching Assistant for COMP-126 Web Development, where he supports over 60 students in web development concepts.",
  },
  {
    id: "24",
    text: "Son is a Microsoft Learn Student Ambassador and Project Manager for the Google Developer Students Club at UNC-Chapel Hill.",
  },
  {
    id: "25",
    text: "Son contributed to 6 large-scale projects benefiting over 350 people in Chapel Hill, NC.",
  },
  {
    id: "26",
    text: "Son is proficient in JavaScript, Python, and Object-Oriented Programming (OOP).",
  },
  {
    id: "27",
    text: "Son is fluent in English (Full Professional Proficiency) and Vietnamese (Native Proficiency).",
  },
  {
    id: "28",
    text: "Son holds certifications in Swift, Power BI, Leadership & Communication, and Machine Learning for Data Science.",
  },
  {
    id: "29",
    text: "Son earned a CS198.1x Bitcoin and Cryptocurrencies Certificate from Berkeley.",
  },
  {
    id: "30",
    text: "Honors: Cum Laude Recognition, AP Scholar, Dean's High Honors List (Fall 2022).",
  },
  {
    id: "31",
    text: "Son achieved Maximum Honor in both 2020-2021 and 2021-2022 academic years.",
  },
  {
    id: "32",
    text: "Son is an AI enthusiast who enjoys researching generative AI, embeddings, and NLP models.",
  },
  {
    id: "33",
    text: "At FPT Software, Son contributed to building backend APIs and frontend components for enterprise software solutions.",
  },
  {
    id: "34",
    text: "Son developed UI/UX designs for FPT Software using Figma, leading to a 20% increase in user engagement.",
  },
  {
    id: "35",
    text: "Son contributed to the chatbot feature of FPT Software’s internal tools, improving NLP accuracy by 15%.",
  },
  {
    id: "36",
    text: "Son has hands-on experience with ELK Stack (Elasticsearch, Logstash, Kibana) for data analysis and visualization.",
  },
  {
    id: "37",
    text: "Son has worked with Redis, RabbitMQ, and Apache Kafka for messaging and event-driven architectures.",
  },
  {
    id: "38",
    text: "Son developed a scalable internal messaging tool that enhanced employee collaboration at FPT Software.",
  },
  {
    id: "39",
    text: "Son's research includes applied machine learning, fine-tuning models, and transfer learning.",
  },
  {
    id: "40",
    text: "Son is passionate about ethical AI development and responsible AI governance.",
  },
  {
    id: "41",
    text: "Son is an advocate for STEM education and enjoys mentoring young developers.",
  },
  {
    id: "42",
    text: "Son was a keynote speaker at the UNC AI Summit, discussing real-world AI applications.",
  },
  {
    id: "43",
    text: "Son built an open-source API for sentiment analysis, used by researchers worldwide.",
  },
  {
    id: "44",
    text: "Son co-authored a research paper on AI-powered recommendation systems in 2023.",
  },
  { id: "45", text: "Son contributes to AI open-source projects on GitHub." },
  { id: "46", text: "Son is an AWS Certified Cloud Practitioner." },
  {
    id: "47",
    text: "Son volunteers as a tutor for underprivileged students learning Python and JavaScript.",
  },
  {
    id: "48",
    text: "Son believes in continuous learning and frequently attends AI/ML conferences.",
  },
  {
    id: "49",
    text: "Son actively contributes to AI discussions on LinkedIn and Medium.",
  },
  {
    id: "50",
    text: "Son maintains a personal portfolio website at sonnguyenhoang.com.",
  },
  {
    id: "51",
    text: "Pinecone is a vector database that enables fast similarity search and recommendation systems, and is used by Lumina for knowledge retrieval.",
  },
  {
    id: "52",
    text: "Son is also a Full-Stack Developer at CS+Social Good Club at UNC-Chapel Hill, where he builds web applications for social impact projects.",
  },
];

/**
 * Stores knowledge base items in FAISS.
 */
async function storeKnowledge() {
  const vectors = [];

  for (const item of knowledgeBase) {
    try {
      console.log(`Generating embedding for: "${item.text}"...`);

      // Generate the embedding
      const embeddingResponse = await model.embedContent(item.text);
      const embedding = embeddingResponse.embedding.values; // ✅ Extract embedding vector

      if (!embedding || !Array.isArray(embedding)) {
        throw new Error("Invalid embedding response format.");
      }

      // Add vector to batch
      vectors.push({
        id: item.id,
        values: embedding,
        metadata: { text: item.text },
      });
    } catch (error) {
      console.error(`❌ Error processing "${item.text}":`, error);
    }
  }

  // Upsert all vectors at once
  if (vectors.length > 0) {
    const vectorStore = await FAISS.load(process.env.FAISS_INDEX_PATH, new HuggingFaceEmbeddings());
    await vectorStore.addVectors(vectors);
    console.log(`✅ Successfully stored ${vectors.length} items in FAISS.`);
  }
}

// Run the function to store knowledge base in FAISS
storeKnowledge();
