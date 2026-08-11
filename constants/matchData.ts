export type MatchResult = "win" | "loss" | "tie";
export type WinReason = "correct_answers" | "timeout";

export interface QuestionRecord {
  id: string;
  question: string;
  correctAnswer: string;
  playerAnswer: string;
  opponentAnswer: string;
  playerCorrect: boolean;
  opponentCorrect: boolean;
}

export interface MatchRecord {
  id: string;
  opponent: string;
  subject: string;
  topic: string;
  playerScore: number;
  opponentScore: number;
  totalQuestions: number;
  result: MatchResult;
  winReason?: WinReason;
  date: string;
  duration: string;
  questions: QuestionRecord[];
}

export const MATCH_HISTORY: MatchRecord[] = [
  {
    id: "m1",
    opponent: "Alex K.",
    subject: "Mathematics",
    topic: "Algebra",
    playerScore: 8,
    opponentScore: 5,
    totalQuestions: 10,
    result: "win",
    winReason: "correct_answers",
    date: "Today, 10:30 AM",
    duration: "3m 12s",
    questions: [
      { id: "q1", question: "Solve for x: 2x + 5 = 11", correctAnswer: "3", playerAnswer: "3", opponentAnswer: "4", playerCorrect: true, opponentCorrect: false },
      { id: "q2", question: "What is the slope of y = 3x - 7?", correctAnswer: "3", playerAnswer: "3", opponentAnswer: "3", playerCorrect: true, opponentCorrect: true },
      { id: "q3", question: "Expand: (x + 2)(x - 3)", correctAnswer: "x² - x - 6", playerAnswer: "x² - x - 6", opponentAnswer: "x² + x - 6", playerCorrect: true, opponentCorrect: false },
      { id: "q4", question: "If f(x) = 2x², find f(3)", correctAnswer: "18", playerAnswer: "18", opponentAnswer: "12", playerCorrect: true, opponentCorrect: false },
      { id: "q5", question: "Solve: x² - 9 = 0", correctAnswer: "x = ±3", playerAnswer: "x = ±3", opponentAnswer: "x = 3", playerCorrect: true, opponentCorrect: false },
      { id: "q6", question: "What is the y-intercept of 2x + 3y = 6?", correctAnswer: "2", playerAnswer: "3", opponentAnswer: "2", playerCorrect: false, opponentCorrect: true },
      { id: "q7", question: "Simplify: 3(2x - 4) + 6", correctAnswer: "6x - 6", playerAnswer: "6x - 6", opponentAnswer: "6x - 12", playerCorrect: true, opponentCorrect: false },
      { id: "q8", question: "Find the vertex of y = x² - 4x + 3", correctAnswer: "(2, -1)", playerAnswer: "(2, -1)", opponentAnswer: "(2, 1)", playerCorrect: true, opponentCorrect: false },
      { id: "q9", question: "Solve: |2x - 6| = 4", correctAnswer: "x = 1 or x = 5", playerAnswer: "x = 5", opponentAnswer: "x = 1 or x = 5", playerCorrect: false, opponentCorrect: true },
      { id: "q10", question: "What is the discriminant of x² + 4x + 4?", correctAnswer: "0", playerAnswer: "0", opponentAnswer: "16", playerCorrect: true, opponentCorrect: false },
    ],
  },
  {
    id: "m2",
    opponent: "Priya S.",
    subject: "Science",
    topic: "Physics – Forces",
    playerScore: 4,
    opponentScore: 7,
    totalQuestions: 10,
    result: "loss",
    winReason: "correct_answers",
    date: "Today, 8:15 AM",
    duration: "4m 05s",
    questions: [
      { id: "q1", question: "What is Newton's Second Law formula?", correctAnswer: "F = ma", playerAnswer: "F = mv", opponentAnswer: "F = ma", playerCorrect: false, opponentCorrect: true },
      { id: "q2", question: "Unit of force in SI system?", correctAnswer: "Newton", playerAnswer: "Newton", opponentAnswer: "Newton", playerCorrect: true, opponentCorrect: true },
      { id: "q3", question: "What force opposes sliding motion?", correctAnswer: "Friction", playerAnswer: "Friction", opponentAnswer: "Friction", playerCorrect: true, opponentCorrect: true },
      { id: "q4", question: "An object at rest stays at rest unless acted upon by a net force. This is Newton's __ Law.", correctAnswer: "First", playerAnswer: "Second", opponentAnswer: "First", playerCorrect: false, opponentCorrect: true },
      { id: "q5", question: "If mass = 5 kg and acceleration = 4 m/s², find force.", correctAnswer: "20 N", playerAnswer: "20 N", opponentAnswer: "20 N", playerCorrect: true, opponentCorrect: true },
      { id: "q6", question: "What is the reaction to a book pressing on a table?", correctAnswer: "Table pushes up on book", playerAnswer: "Gravity pulls book down", opponentAnswer: "Table pushes up on book", playerCorrect: false, opponentCorrect: true },
      { id: "q7", question: "Free-fall acceleration on Earth (approx)?", correctAnswer: "9.8 m/s²", playerAnswer: "9.8 m/s²", opponentAnswer: "9.8 m/s²", playerCorrect: true, opponentCorrect: true },
      { id: "q8", question: "A 10 N force and 6 N force act in opposite directions. Net force?", correctAnswer: "4 N", playerAnswer: "16 N", opponentAnswer: "4 N", playerCorrect: false, opponentCorrect: true },
      { id: "q9", question: "Which quantity is a vector?", correctAnswer: "Force", playerAnswer: "Force", opponentAnswer: "Force", playerCorrect: true, opponentCorrect: true },
      { id: "q10", question: "Weight = mass × ?", correctAnswer: "g", playerAnswer: "g", opponentAnswer: "velocity", playerCorrect: true, opponentCorrect: false },
    ],
  },
  {
    id: "m3",
    opponent: "Sam T.",
    subject: "English",
    topic: "Vocabulary",
    playerScore: 6,
    opponentScore: 6,
    totalQuestions: 10,
    result: "tie",
    date: "Yesterday, 6:00 PM",
    duration: "2m 50s",
    questions: [
      { id: "q1", question: "Synonym of 'benevolent'", correctAnswer: "Kind", playerAnswer: "Kind", opponentAnswer: "Cruel", playerCorrect: true, opponentCorrect: false },
      { id: "q2", question: "Antonym of 'loquacious'", correctAnswer: "Taciturn", playerAnswer: "Silent", opponentAnswer: "Taciturn", playerCorrect: false, opponentCorrect: true },
      { id: "q3", question: "Define 'ephemeral'", correctAnswer: "Short-lived", playerAnswer: "Short-lived", opponentAnswer: "Short-lived", playerCorrect: true, opponentCorrect: true },
      { id: "q4", question: "Word meaning 'to speak ill of'", correctAnswer: "Defame", playerAnswer: "Defame", opponentAnswer: "Defame", playerCorrect: true, opponentCorrect: true },
      { id: "q5", question: "Synonym of 'ambiguous'", correctAnswer: "Unclear", playerAnswer: "Clear", opponentAnswer: "Unclear", playerCorrect: false, opponentCorrect: true },
      { id: "q6", question: "Antonym of 'verbose'", correctAnswer: "Concise", playerAnswer: "Concise", opponentAnswer: "Wordy", playerCorrect: true, opponentCorrect: false },
      { id: "q7", question: "What does 'ubiquitous' mean?", correctAnswer: "Everywhere", playerAnswer: "Everywhere", opponentAnswer: "Everywhere", playerCorrect: true, opponentCorrect: true },
      { id: "q8", question: "Synonym of 'gregarious'", correctAnswer: "Sociable", playerAnswer: "Shy", opponentAnswer: "Sociable", playerCorrect: false, opponentCorrect: true },
      { id: "q9", question: "Antonym of 'opaque'", correctAnswer: "Transparent", playerAnswer: "Transparent", opponentAnswer: "Opaque", playerCorrect: true, opponentCorrect: false },
      { id: "q10", question: "What does 'pragmatic' mean?", correctAnswer: "Practical", playerAnswer: "Impractical", opponentAnswer: "Practical", playerCorrect: false, opponentCorrect: true },
    ],
  },
  {
    id: "m4",
    opponent: "Jordan M.",
    subject: "History",
    topic: "World War II",
    playerScore: 9,
    opponentScore: 3,
    totalQuestions: 10,
    result: "win",
    winReason: "timeout",
    date: "Yesterday, 2:45 PM",
    duration: "1m 48s",
    questions: [
      { id: "q1", question: "In which year did World War II begin?", correctAnswer: "1939", playerAnswer: "1939", opponentAnswer: "1939", playerCorrect: true, opponentCorrect: true },
      { id: "q2", question: "Which country did Germany invade to start WWII?", correctAnswer: "Poland", playerAnswer: "Poland", opponentAnswer: "France", playerCorrect: true, opponentCorrect: false },
      { id: "q3", question: "What was the codename for the Allied invasion of Normandy?", correctAnswer: "Operation Overlord", playerAnswer: "Operation Overlord", opponentAnswer: "Operation Barbarossa", playerCorrect: true, opponentCorrect: false },
      { id: "q4", question: "Who was the Prime Minister of the UK during most of WWII?", correctAnswer: "Winston Churchill", playerAnswer: "Winston Churchill", opponentAnswer: "Neville Chamberlain", playerCorrect: true, opponentCorrect: false },
      { id: "q5", question: "In which year did WWII end?", correctAnswer: "1945", playerAnswer: "1945", opponentAnswer: "1945", playerCorrect: true, opponentCorrect: true },
      { id: "q6", question: "What was the name of the atomic bomb dropped on Hiroshima?", correctAnswer: "Little Boy", playerAnswer: "Little Boy", opponentAnswer: "Fat Man", playerCorrect: true, opponentCorrect: false },
      { id: "q7", question: "Which event brought the USA into WWII?", correctAnswer: "Attack on Pearl Harbor", playerAnswer: "Attack on Pearl Harbor", opponentAnswer: "Invasion of France", playerCorrect: true, opponentCorrect: false },
      { id: "q8", question: "What was the Holocaust?", correctAnswer: "Genocide of Jewish people by Nazis", playerAnswer: "Genocide of Jewish people by Nazis", opponentAnswer: "Genocide of Jewish people by Nazis", playerCorrect: true, opponentCorrect: true },
      { id: "q9", question: "Which battle was a turning point on the Eastern Front?", correctAnswer: "Battle of Stalingrad", playerAnswer: "Battle of Stalingrad", opponentAnswer: "Battle of Britain", playerCorrect: true, opponentCorrect: false },
      { id: "q10", question: "What was the Blitzkrieg strategy?", correctAnswer: "Fast-moving combined arms attack", playerAnswer: "Fast-moving combined arms attack", opponentAnswer: "Naval blockade", playerCorrect: false, opponentCorrect: false },
    ],
  },
];
