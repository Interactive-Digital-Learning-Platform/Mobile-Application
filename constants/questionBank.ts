export interface Question {
  id: string;
  question: string;
  options: string[];
  correct: number;
}

export const QUESTION_BANK: Record<string, Question[]> = {
  Mathematics: [
    { id: "m1",  question: "Solve for x: 3x - 7 = 14",                              options: ["6","7","8","9"],                                                correct: 1 },
    { id: "m2",  question: "What is 15% of 200?",                                    options: ["25","30","35","40"],                                            correct: 1 },
    { id: "m3",  question: "Area of a circle with radius 5?",                         options: ["25π","10π","5π","50π"],                                         correct: 0 },
    { id: "m4",  question: "Square root of 144?",                                    options: ["10","11","12","13"],                                            correct: 2 },
    { id: "m5",  question: "Evaluate: 2³ × 2²",                                      options: ["16","32","64","8"],                                             correct: 1 },
    { id: "m6",  question: "What is the slope of y = -4x + 3?",                      options: ["3","4","-4","-3"],                                              correct: 2 },
    { id: "m7",  question: "Simplify: (x² - 9) / (x - 3)",                           options: ["x+3","x-3","x+9","x²+3"],                                       correct: 0 },
    { id: "m8",  question: "What is 7! (factorial)?",                                options: ["2520","5040","720","40320"],                                    correct: 1 },
    { id: "m9",  question: "Median of 3, 7, 1, 9, 4?",                              options: ["4","7","3","5"],                                                correct: 0 },
    { id: "m10", question: "Value of sin(90°)?",                                     options: ["0","0.5","1","-1"],                                             correct: 2 },
  ],
  Science: [
    { id: "s1",  question: "Chemical symbol for gold?",                              options: ["Go","Gd","Au","Ag"],                                            correct: 2 },
    { id: "s2",  question: "Most abundant gas in Earth's atmosphere?",               options: ["Oxygen","Carbon dioxide","Nitrogen","Argon"],                    correct: 2 },
    { id: "s3",  question: "Powerhouse of the cell?",                                options: ["Nucleus","Ribosome","Mitochondria","Golgi body"],                correct: 2 },
    { id: "s4",  question: "Speed of light in vacuum?",                              options: ["3×10⁸ m/s","3×10⁶ m/s","3×10¹⁰ m/s","3×10⁴ m/s"],             correct: 0 },
    { id: "s5",  question: "Atomic number of Carbon?",                               options: ["4","6","8","12"],                                               correct: 1 },
    { id: "s6",  question: "Which planet is closest to the Sun?",                    options: ["Venus","Earth","Mercury","Mars"],                               correct: 2 },
    { id: "s7",  question: "Boiling point of water in Celsius?",                     options: ["90°C","95°C","100°C","105°C"],                                  correct: 2 },
    { id: "s8",  question: "Bond type between H₂O molecules?",                      options: ["Ionic","Covalent","Hydrogen","Metallic"],                       correct: 2 },
    { id: "s9",  question: "F = ma is Newton's ___ Law",                             options: ["First","Second","Third","Fourth"],                              correct: 1 },
    { id: "s10", question: "SI unit of electric current?",                           options: ["Volt","Ohm","Ampere","Watt"],                                   correct: 2 },
  ],
  History: [
    { id: "h1",  question: "WWII ended in which year?",                              options: ["1943","1944","1945","1946"],                                    correct: 2 },
    { id: "h2",  question: "First President of the United States?",                  options: ["John Adams","Thomas Jefferson","George Washington","Madison"],   correct: 2 },
    { id: "h3",  question: "French Revolution began in?",                            options: ["1776","1789","1799","1804"],                                    correct: 1 },
    { id: "h4",  question: "Communist Manifesto was written by?",                    options: ["Lenin","Stalin","Mao","Marx and Engels"],                       correct: 3 },
    { id: "h5",  question: "Cold War was between which two nations?",                options: ["UK & Germany","USA & USSR","France & USA","China & USA"],       correct: 1 },
    { id: "h6",  question: "First woman to win a Nobel Prize?",                      options: ["Rosalind Franklin","Marie Curie","Florence Nightingale","Ada"], correct: 1 },
    { id: "h7",  question: "Renaissance began in which country?",                    options: ["France","Spain","England","Italy"],                             correct: 3 },
    { id: "h8",  question: "Ancient wonder located in Alexandria?",                  options: ["Colossus","Lighthouse","Hanging Gardens","Statue of Zeus"],     correct: 1 },
    { id: "h9",  question: "First country to grant women the right to vote?",        options: ["USA","UK","New Zealand","Australia"],                           correct: 2 },
    { id: "h10", question: "Which empire was ruled by Napoleon?",                    options: ["Ottoman","French","British","Roman"],                           correct: 1 },
  ],
  English: [
    { id: "e1",  question: "Synonym of 'benevolent'?",                               options: ["Cruel","Kind","Lazy","Brave"],                                  correct: 1 },
    { id: "e2",  question: "Antonym of 'verbose'?",                                  options: ["Talkative","Noisy","Concise","Loud"],                           correct: 2 },
    { id: "e3",  question: "'The stars danced' — which literary device?",            options: ["Simile","Metaphor","Personification","Hyperbole"],              correct: 2 },
    { id: "e4",  question: "What does 'ephemeral' mean?",                            options: ["Eternal","Short-lived","Significant","Dangerous"],              correct: 1 },
    { id: "e5",  question: "Past tense of 'arise'?",                                 options: ["Arised","Arosen","Arose","Arises"],                             correct: 2 },
    { id: "e6",  question: "Plural of 'phenomenon'?",                                options: ["Phenomenons","Phenomena","Phenomenas","Phenomenes"],            correct: 1 },
    { id: "e7",  question: "Type of noun: 'happiness'?",                             options: ["Proper","Collective","Abstract","Concrete"],                    correct: 2 },
    { id: "e8",  question: "Which is a conjunction?",                                options: ["Quickly","Beautiful","Although","Toward"],                      correct: 2 },
    { id: "e9",  question: "Correct sentence?",                                      options: ["She don't know","She doesn't knows","She doesn't know","She don't knows"], correct: 2 },
    { id: "e10", question: "What is a 'simile'?",                                    options: ["Direct comparison","Comparison using like/as","Exaggeration","Giving human traits"], correct: 1 },
  ],
  Geography: [
    { id: "g1",  question: "Largest continent by area?",                             options: ["Africa","North America","Asia","Antarctica"],                   correct: 2 },
    { id: "g2",  question: "Longest river in the world?",                            options: ["Amazon","Nile","Mississippi","Yangtze"],                        correct: 1 },
    { id: "g3",  question: "Capital of Australia?",                                  options: ["Sydney","Melbourne","Brisbane","Canberra"],                     correct: 3 },
    { id: "g4",  question: "Largest ocean?",                                         options: ["Atlantic","Indian","Arctic","Pacific"],                         correct: 3 },
    { id: "g5",  question: "Mount Everest is in which range?",                       options: ["Andes","Alps","Himalayas","Rockies"],                           correct: 2 },
    { id: "g6",  question: "Country with most natural lakes?",                       options: ["Russia","USA","Brazil","Canada"],                               correct: 3 },
    { id: "g7",  question: "Smallest country in the world?",                         options: ["Monaco","Vatican City","San Marino","Liechtenstein"],           correct: 1 },
    { id: "g8",  question: "Sahara Desert is on which continent?",                   options: ["Asia","Australia","Africa","South America"],                    correct: 2 },
    { id: "g9",  question: "Capital of Brazil?",                                     options: ["São Paulo","Rio de Janeiro","Brasília","Salvador"],             correct: 2 },
    { id: "g10", question: "Country with largest population?",                       options: ["USA","India","China","Russia"],                                 correct: 1 },
  ],
  Programming: [
    { id: "p1",  question: "HTML stands for?",                                       options: ["HyperText Markup Language","High-Tech Modern Language","HyperText Machine Language","Home Tool Markup Language"], correct: 0 },
    { id: "p2",  question: "LIFO data structure?",                                   options: ["Queue","Stack","Tree","Graph"],                                 correct: 1 },
    { id: "p3",  question: "Time complexity of binary search?",                      options: ["O(n)","O(n²)","O(log n)","O(1)"],                               correct: 2 },
    { id: "p4",  question: "API stands for?",                                        options: ["Application Programming Interface","Applied Process Integration","Automated Program Installer","App Proxy Interface"], correct: 0 },
    { id: "p5",  question: "NOT a JavaScript data type?",                            options: ["String","Boolean","Integer","Undefined"],                       correct: 2 },
    { id: "p6",  question: "Single-line comment symbol in Python?",                  options: ["//","/*","#","--"],                                             correct: 2 },
    { id: "p7",  question: "CSS stands for?",                                        options: ["Computer Style Sheets","Cascading Style Sheets","Colorful Style Sheets","Creative Style System"], correct: 1 },
    { id: "p8",  question: "O(n log n) average sort algorithm?",                     options: ["Bubble Sort","Insertion Sort","Merge Sort","Selection Sort"],   correct: 2 },
    { id: "p9",  question: "What is 'null'?",                                        options: ["Zero","Empty string","Absence of value","False"],               correct: 2 },
    { id: "p10", question: "HTTP method to retrieve data?",                          options: ["POST","PUT","DELETE","GET"],                                    correct: 3 },
  ],
};

export function getQuestions(subject: string, count: number): Question[] {
  const bank = QUESTION_BANK[subject] ?? QUESTION_BANK["Mathematics"];
  const result: Question[] = [];
  while (result.length < count) {
    result.push(...bank.slice(0, Math.min(bank.length, count - result.length)));
  }
  return result.slice(0, count);
}
