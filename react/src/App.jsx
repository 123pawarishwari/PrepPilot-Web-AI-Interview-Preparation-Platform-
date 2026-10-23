import { useState } from "react";

const questions = [
  { q: "What is the difference between a list and a tuple in Python?", a: "Lists are mutable. Tuples are immutable and slightly faster." },
  { q: "What is the difference between let, const and var?", a: "var is function-scoped. let and const are block-scoped. const cannot be reassigned." },
  { q: "What is the difference between INNER JOIN and LEFT JOIN?", a: "INNER JOIN keeps matching rows only. LEFT JOIN keeps every row from the left table." },
  { q: "Tell me about yourself.", a: "Share your education, skills, projects and why this role fits your goals." },
];

export default function App() {
  const [index, setIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [known, setKnown] = useState(0);

  const card = questions[index];
  const isLast = index === questions.length - 1;

  const next = (gotIt) => {
    if (gotIt) setKnown(known + 1);
    setShowAnswer(false);
    setIndex(isLast ? 0 : index + 1);
  };

  return (
    <div className="app">
      <h1>PrepPilot Flashcards</h1>
      <p className="meta">Card {index + 1} of {questions.length} · Known: {known}</p>

      <div className="card">
        <h2>{card.q}</h2>
        {showAnswer ? <p className="answer">{card.a}</p> : null}
      </div>

      <div className="buttons">
        <button onClick={() => setShowAnswer(!showAnswer)}>
          {showAnswer ? "Hide answer" : "Show answer"}
        </button>
        <button onClick={() => next(true)}>I knew it</button>
        <button onClick={() => next(false)}>Still learning</button>
      </div>
    </div>
  );
}
