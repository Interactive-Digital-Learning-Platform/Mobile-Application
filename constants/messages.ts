import { MessageType } from "@/types/chatModuleTypes";

export const sampleMessages: MessageType[] = [
  {
    id: "1",
    createdAt: new Date(),
    role: "user",
    content: "Explain what a loop is in Python",
    type: "text"
  },
  {
    id: "2",
    createdAt: new Date(),
    role: "assistant",
    content:
      "A loop is used to repeat a block of code multiple times. In Python, common loops are 'for' and 'while'.",
    type: "text",
    tokens: 45,
  },
  {
    id: "3",
    createdAt: new Date(),
    role: "assistant",
    content: "for i in range(5):\n    print(i)",
    type: "code",
    tokens: 20,
  },
  {
    id: "4",
    createdAt: new Date(),
    role: "user",
    content: "Can you give me a real-world example?",
    type: "text"
  },
  {
    id: "5",
    createdAt: new Date(),
    role: "assistant",
    content:
      "Imagine you are taking attendance for 30 students. Instead of writing the same code 30 times, you use a loop to repeat the process.",
    citations: [
      {
        title: "Python Official Docs",
        from: "python.org",
        content: "Loops are used for iterating over sequences.",
      },
    ],
    type: "text"
  },
  {
    id: "6",
    createdAt: new Date(),
    role: "assistant",
    content: "Generating more examples...",
    isLoading: true,
    type: "text"
  },
  {
    id: "7",
    createdAt: new Date(),
    role: "assistant",
    content: "Sorry, something went wrong while generating the response.",
    isError: true,
    type: "text"
  },
  {
    id: "8",
    createdAt: new Date(),
    role: "user",
    content: "What is the difference between for loop and while loop?",
    type: "text"
  },
  {
    id: "9",
    createdAt: new Date(),
    role: "assistant",
    content:
      "A 'for' loop is used when the number of iterations is known, while a 'while' loop is used when the condition must be checked before each iteration.",
    tokens: 60,
    type: "text"
  },
  {
    id: "10",
    createdAt: new Date(),
    role: "assistant",
    content:
      "Here are some references you can check for deeper understanding.",
    citations: [
      {
        title: "W3Schools Python Loops",
        from: "w3schools.com",
        content: "Python supports for loops and while loops.",
      },
      {
        title: "GeeksforGeeks Loops",
        from: "geeksforgeeks.org",
        content: "Loops help automate repetitive tasks.",
      },
    ],
    type: "text"
  },
];