import { useEffect, useState } from "react";
import { Row, RowState } from "./Row";
import dictionary from "./dictionary.json";
import { Clue, clue, describeClue, hasPreviousClues } from "./clue";
import { Keyboard } from "./Keyboard";
import targetList from "./targets.json";
import { dictionarySet, pick, resetRng, seed, speak, sharedState, encodeShare } from "./util";

enum GameState {
  Playing,
  Won,
  Lost,
}

interface GameProps {
  maxGuesses: number;
  hidden: boolean;
}

const targets = targetList.slice(0, targetList.indexOf("murky") + 1); // Words no rarer than this one

// woo, this is some real slop
let shareStateOnce = sharedState();
let shareTarget = "";
let shareFirstGuess = "";
function setShare(target: string, firstGuess: string, where: string)
{
    shareTarget = target;
    shareFirstGuess = firstGuess;

    // console.log(`setShare(${shareTarget}, ${shareFirstGuess}) [${where}]`);
}

function randomTarget(wordLength: number) {
  const eligible = targets.filter((word) => word.length === wordLength);
  return pick(eligible);
}

function shareGame(target: string, firstGuess: string)
{
  if(navigator.share) {
      let p = new URLSearchParams(window.location.search);
      const s = encodeShare(target, firstGuess);
      p.set('share', s);
      // console.log(p.toString());
      navigator.share({
        title: `Skittl Game ${s}`,
        url: '?' + p.toString()
      });
  }
  return undefined;
}

function Game(props: GameProps) {
  // console.log(shareStateOnce);

  const [gameState, setGameState] = useState(GameState.Playing);
  const [currentGuess, setCurrentGuess] = useState<string>("");
  const [wordLength, setWordLength] = useState(5);
  const [hint, setHint] = useState<string>(`Make your first guess!`);
  const [srStatus, setSrStatus] = useState<string>(``);
  const [target, setTarget] = useState(() => {
    if(shareStateOnce.length > 0) {
      // console.log(`target: ${shareStateOnce[0]}`);
      return shareStateOnce[0];
    }
    resetRng();
    const t = randomTarget(wordLength)
    // console.log(`target: ${t}`);
    return t;
  });

  const [guesses, setGuesses] = useState<string[]>(() => {
    let firstGuess = "";
    if(shareStateOnce.length > 0) {
      firstGuess = shareStateOnce[1];
    } else {
      firstGuess = randomTarget(wordLength);
      while(firstGuess === target) {
        firstGuess = randomTarget(wordLength);
      }
    }
    // console.log(`firstGuess: ${firstGuess}`);
    return [firstGuess];
  });
  const [gameNumber, setGameNumber] = useState(() => {
    if(shareStateOnce.length > 0) {
      return 0;
    }
    return 1;
  });
  setShare(target, guesses[0], "initial");

  const startNextGame = () => {
    let target = randomTarget(wordLength);
    let firstGuess = randomTarget(wordLength);
    while(firstGuess === target) {
      firstGuess = randomTarget(wordLength);
    }
    setShare(target, firstGuess, "startNextGame");
    setTarget(target);
    setGuesses([firstGuess]);
    setCurrentGuess("");
    setHint("");
    setGameState(GameState.Playing);
    setGameNumber((x) => x + 1);
  };

  const onKey = (key: string) => {
    // console.log("clearing shareStateOnce");
    shareStateOnce = [];

    if (gameState !== GameState.Playing) {
      if (key === "Enter") {
        startNextGame();
      }
      return;
    }
    if (guesses.length === props.maxGuesses) return;
    if (/^[a-z]$/.test(key)) {
      setCurrentGuess((guess) => (guess + key).slice(0, wordLength));
      setHint("");
      setSrStatus("");
    } else if (key === "Backspace") {
      setCurrentGuess((guess) => guess.slice(0, -1));
      setHint("");
    } else if (key === "Enter") {
      if (currentGuess.length !== wordLength) {
        setHint("Too short");
        return;
      }
      if (!dictionary.includes(currentGuess)) {
        setHint("Not a valid word");
        return;
      }
      if (guesses.length > 0) {
        let hint = hasPreviousClues(guesses, currentGuess, target);
        if(hint.length > 0) {
          setHint(hint);
          return;
        }
      }
      setGuesses((guesses) => guesses.concat([currentGuess]));
      setCurrentGuess((guess) => "");
      if (currentGuess === target) {
        setHint(
          `You won! The answer was ${target.toUpperCase()}. (Enter to play again)`
        );
        setGameState(GameState.Won);
      } else if (guesses.length + 1 === props.maxGuesses) {
        setHint(
          `You lost! The answer was ${target.toUpperCase()}. (Enter to play again)`
        );
        setGameState(GameState.Lost);
      } else {
        setHint("");
        speak(describeClue(clue(currentGuess, target)));
      }
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) {
        onKey(e.key);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [currentGuess, gameState]);

  let letterInfo = new Map<string, Clue>();
  const tableRows = Array(props.maxGuesses)
    .fill(undefined)
    .map((_, i) => {
      const guess = [...guesses, currentGuess][i] ?? "";
      const cluedLetters = clue(guess, target);
      const lockedIn = i < guesses.length;
      if (lockedIn) {
        for (const { clue, letter } of cluedLetters) {
          if (clue === undefined) break;
          const old = letterInfo.get(letter);
          if (old === undefined || clue > old) {
            letterInfo.set(letter, clue);
          }
        }
      }
      return (
        <Row
          key={i}
          wordLength={wordLength}
          rowState={
            lockedIn
              ? RowState.LockedIn
              : i === guesses.length
              ? RowState.Editing
              : RowState.Pending
          }
          cluedLetters={cluedLetters}
        />
      );
    });

  return (
    <div className="Game" style={{ display: props.hidden ? "none" : "block" }}>
      <div className="Game-options">
        <button
          style={{ flex: "0 0 auto" }}
          disabled={gameState !== GameState.Playing || guesses.length === 0}
          onClick={() => {
            setHint(
              `The answer was ${target.toUpperCase()}. (Enter to play again)`
            );
            setGameState(GameState.Lost);
            (document.activeElement as HTMLElement)?.blur();
          }}
        >
          Give up
        </button>
        <button
          style={{ flex: "0 0 auto" }}
          onClick={() => {
            shareGame(shareTarget, shareFirstGuess);
          }}
        >
          Share
        </button>
      </div>
      <table className="Game-rows" tabIndex={0} aria-label="Table of guesses">
        <tbody>{tableRows}</tbody>
      </table>
      <p className="hints" role="alert">{hint || `\u00a0`}</p>
      {/* <p role="alert" className="Game-sr-feedback">
        {srStatus}
      </p> */}
      <Keyboard letterInfo={letterInfo} onKey={onKey} />
      {seed ? (
        <div className="Game-seed-info">
          seed {seed}, length {wordLength}, game {gameNumber > 0 ? gameNumber : "[shared]"}
        </div>
      ) : undefined}
    </div>
  );
}

export default Game;
