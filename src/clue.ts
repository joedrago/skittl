export enum Clue {
  Absent,
  Elsewhere,
  Correct,
}

export interface CluedLetter {
  clue?: Clue;
  letter: string;
}

export function clue(word: string, target: string): CluedLetter[] {
  let elusive: string[] = [];
  target.split("").forEach((letter, i) => {
    if (word[i] !== letter) {
      elusive.push(letter);
    }
  });
  return word.split("").map((letter, i) => {
    let j: number;
    if (target[i] === letter) {
      return { clue: Clue.Correct, letter };
    } else if ((j = elusive.indexOf(letter)) > -1) {
      // "use it up" so we don't clue at it twice
      elusive[j] = "";
      return { clue: Clue.Elsewhere, letter };
    } else {
      return { clue: Clue.Absent, letter };
    }
  });
}

export function clueClass(clue: Clue): string {
  if (clue === Clue.Absent) {
    return "letter-absent";
  } else if (clue === Clue.Elsewhere) {
    return "letter-elsewhere";
  } else {
    return "letter-correct";
  }
}

export function clueWord(clue: Clue): string {
  if (clue === Clue.Absent) {
    return "no";
  } else if (clue === Clue.Elsewhere) {
    return "elsewhere";
  } else {
    return "correct";
  }
}

export function describeClue(clue: CluedLetter[]): string {
  return clue
    .map(({ letter, clue }) => letter.toUpperCase() + " " + clueWord(clue!))
    .join(", ");
}

function removeIfExists(arr : string[], c : string) : string[] {
   for (var i = arr.length; i--;) {
      if (arr[i] === c) {
        arr.splice(i, 1);
        return arr;
      }
   }
   return arr;
}

export function hasPreviousClues(guesses: string[], currentGuess: string, target: string) : string
{
  const currentGuessClues = clue(currentGuess, target);
  let hints : string[] = [];

  let grays = new Map<string, boolean>();
  for(let prevGuess of guesses) {
    let prevGuessClues = clue(prevGuess, target);

    // Collect grays
    prevGuessClues.forEach((c, i) => {
      if(c.clue == Clue.Absent) {
        grays.set(c.letter.toUpperCase(), true);
      }
    });

    // Check greens and unmoved yellows
    let missingGreens : string[] = [];
    let unmovedYellows : string[] = [];
    for(let i = 0; i < currentGuessClues.length; ++i) {
      if((prevGuessClues[i].clue === Clue.Correct) && (currentGuessClues[i].clue !== Clue.Correct)) {
        // Someone had a green in this slot already and ruined it
        missingGreens.push(prevGuessClues[i].letter.toUpperCase());
      }
      if((prevGuessClues[i].clue === Clue.Elsewhere) && (currentGuessClues[i].clue === Clue.Elsewhere) && (prevGuessClues[i].letter === currentGuessClues[i].letter)) {
        // Someone had a green in this slot already and ruined it
        unmovedYellows.push(prevGuessClues[i].letter.toUpperCase());
      }
    }
    if(missingGreens.length > 0) {
      hints.push(`You threw away some green! (${missingGreens.join(',')})`);
    }
    if(unmovedYellows.length > 0) {
      hints.push(`You didn't move some yellow! (${unmovedYellows.join(',')})`);
    }

    // Check yellows
    let neededElsewhere : string[] = [];
    prevGuessClues.forEach((c, i) => {
      if(c.clue === Clue.Elsewhere) {
        neededElsewhere.push(c.letter.toUpperCase());
      }
    });
    currentGuessClues.forEach((c, i) => {
      if((c.clue === Clue.Elsewhere) || ((prevGuessClues[i].clue !== Clue.Correct) && (c.clue === Clue.Correct))) {
        neededElsewhere = removeIfExists(neededElsewhere, c.letter.toUpperCase());
      }
    });
    if(neededElsewhere.length > 0) {
      hints.push(`You threw away some yellow! (${neededElsewhere.join(',')})`);
    }
  }

  // check grays

  let allowedCount = new Map<string, number>();
  const prevClues  = clue(guesses[guesses.length - 1], target);
  currentGuessClues.forEach((c, i) => {
    const l = c.letter.toUpperCase();
    let count = allowedCount.get(l) ?? 0;
    if(c.clue !== Clue.Absent) {
      ++count;
    }
    allowedCount.set(l, count);
  });

  let usedGrays : string[] = [];
  currentGuessClues.forEach((c, i) => {
    const l = c.letter.toUpperCase();
    const ac = allowedCount.get(l) ?? 0;
    if(grays.has(l) && (ac == 0)) {
      usedGrays.push(l);
    }
    if(ac > 0) {
      allowedCount.set(l, ac - 1);
    }
  });
  if(usedGrays.length > 0) {
    hints.push(`You used some gray! (${usedGrays.join(',')})`);
  }

  return hints.join("\n");
}
