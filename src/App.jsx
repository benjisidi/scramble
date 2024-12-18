import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import Countdown from "react-countdown";
import { useForm } from "react-hook-form";
import "./App.css";
import wordlistRaw from "./assets/words_3k.txt?raw";

function shuffleArray(array) {
  for (var i = array.length - 1; i >= 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
}

const scramble = (word) => {
  const middle = word.slice(1, -1).split("");
  shuffleArray(middle);
  return `${word.slice(0, 1)}${middle.join("")}${word.slice(-1)}`;
};

const sanitize = (guess) => {
  return guess.toLowerCase().trim();
};

const getRandomWord = (words) => {
  const randomIndex = Math.floor(Math.random() * words.length);
  let word = words[randomIndex];
  let scrambled = word;
  let attempts = 0;
  while (scrambled === word && attempts < 10) {
    scrambled = scramble(word);
    attempts += 1;
  }
  // We've found an unscramble-able word (eg "foot"), pick a new one
  if (scrambled === word) {
    const backup = getRandomWord(words);
    word = backup.word;
    scrambled = backup.scrambled;
  }
  return { word, scrambled };
};

const getHighScore = () => Number(localStorage.getItem("highScore")) || 0;

function App() {
  const gameTime = 45000;
  const words = wordlistRaw
    .split("\n")
    .filter((x) => x.length > 3 && x.length <= 10);
  const [currentWord, setCurrentWord] = useState("");
  const [prevWord, setPrevWord] = useState("");
  const [currentWordScrambled, setCurrentWordScrambled] = useState("");
  const [unscrambled, setUnscrambled] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(getHighScore());
  const [skips, setSkips] = useState(3);
  const [timeup, setTimeup] = useState(false);
  const [endTime, setEndTime] = useState(Date.now() + gameTime);
  const countdownRef = useRef(null);
  const inputRef = useRef(null);
  const formMethods = useForm();
  const { ref: rawInputRef, ...restFormMethods } =
    formMethods.register("guess");
  const currentGuess = formMethods.watch("guess");

  const getNewWord = () => {
    setPrevWord(currentWord);
    const { word, scrambled } = getRandomWord(words);
    setCurrentWord(word);
    setCurrentWordScrambled(scrambled);
    formMethods.clearErrors();
    formMethods.reset();
    formMethods.setFocus("guess");
  };

  const handleReset = () => {
    setScore(0);
    setSkips(3);
    setTimeup(false);
    setEndTime(Date.now() + gameTime);
    getNewWord();
    setPrevWord("");
    setUnscrambled(false);
  };

  const handleSpacebar = () => {
    if (timeup) {
      handleUnscramble();
    }
    // Since some autocorrect will add a space to the end of the word, we'll
    // first check whether the correct word has been typed and advance if so. If
    // not, we'll try to skip.
    if (sanitize(currentGuess) === currentWord) {
      onSubmit({ guess: currentGuess.trim() });
      return;
    }
    if (skips > 0) {
      setSkips((prev) => Math.max(prev - 1, 0));
      getNewWord();
    }
  };

  const handleUnscramble = () => {
    setCurrentWordScrambled(currentWord);
    setUnscrambled(true);
  };

  const handleKey = (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      handleSpacebar();
    }
  };

  // android keyboard events don't have a key, so we have to do this gross hack
  const handleAndroidKey = (e) => {
    if (e.key === "Unidentified") {
      const inputValue = e.target.value;
      if (inputValue.charAt(inputValue.length - 1) === " ") {
        e.preventDefault();
        handleSpacebar();
      }
    }
  };

  const onSubmit = (formData) => {
    if (sanitize(formData.guess) !== currentWord) {
      formMethods.setError("guess");
      return;
    }
    setHighScore(Math.max(highScore, score + 1));
    setScore((prev) => prev + 1);
    getNewWord();
  };

  const handleTimeUp = () => {
    setTimeup(true);
  };

  // Initialise game on render
  useEffect(() => {
    getNewWord();
  }, []);

  // Restart counter and refocus input on reset
  useEffect(() => {
    if (countdownRef.current) {
      countdownRef.current.start();
    }
    inputRef.current?.focus();
  }, [endTime]);

  // Report highscore to localstorage
  useEffect(() => {
    localStorage.setItem("highScore", highScore);
  }, [highScore]);

  return (
    <div className="flex flex-col w-[304px] max-w-[304px]">
      <div className="text-xs flex justify-start">{`Previous: ${prevWord}`}</div>
      <h1>{currentWordScrambled}</h1>
      <div className="flex space-x-2 mt-2 mx-auto">
        <div className="tabular-nums">{`Score: ${score}`}</div>
        <div className="divider divider-horizontal" />
        <div className="tabular-nums">{`Highscore: ${highScore}`}</div>
        <div className="divider divider-horizontal" />
        <Countdown
          date={endTime}
          intervalDelay={1000}
          precision={3}
          onComplete={handleTimeUp}
          renderer={countdownRenderer}
          ref={countdownRef}
        />
      </div>
      <div className="flex space-x-2 mt-2 grow">
        <form onSubmit={formMethods.handleSubmit(onSubmit)} className="grow">
          <input
            ref={(e) => {
              rawInputRef(e);
              inputRef.current = e;
            }}
            autoFocus
            disabled={timeup}
            onKeyDown={handleKey}
            onKeyUp={handleAndroidKey}
            {...restFormMethods}
            autoComplete="off"
            className={clsx("input input-bordered w-[calc(100%-7px)]", {
              "input-error": formMethods.formState.errors.guess,
            })}
          />
        </form>
        {timeup ? (
          <button
            onClick={handleUnscramble}
            disabled={unscrambled}
            className="btn btn-neutral"
          >
            Unscramble
          </button>
        ) : (
          <button
            onClick={handleSpacebar}
            disabled={skips === 0}
            className="btn btn-neutral tabular-nums"
          >{`Skip (${skips})`}</button>
        )}
      </div>
      <button onClick={handleReset} className="btn btn-warning mt-2">
        Again!
      </button>
      <div className="flex space-x-2 mt-2 uppercase small-caps items-center">
        <kbd className="kbd text-xs">↵</kbd>
        <span className="text-xs">guess</span>
        <div className="divider divider-horizontal" />
        <kbd className="kbd text-xs">space</kbd>
        <span className="text-xs">skip</span>
      </div>
    </div>
  );
}

const countdownRenderer = ({ seconds, completed }) => {
  if (completed) {
    return <span>Time up!</span>;
  }
  return (
    <span className="tabular-nums">
      Time: {String(seconds + 1).padStart(2, "0")}
    </span>
  );
};

export default App;
