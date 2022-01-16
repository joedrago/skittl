import dictionary from "./dictionary.json";
import targetList from "./targets.json";

export const dictionarySet: Set<string> = new Set(dictionary);

function mulberry32(a: number) {
  return function () {
    var t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const seed = Number(
  new URLSearchParams(window.location.search).get("seed")
);
const makeRandom = () => (seed ? mulberry32(seed) : () => Math.random());
let random = makeRandom();

export function resetRng(): void {
  random = makeRandom();
}

export function pick<T>(array: Array<T>): T {
  return array[Math.floor(array.length * random())];
}

export function wordToIndex(word: string)
{
  for(let i = 0; i < targetList.length; ++i) {
    if(targetList[i] === word) {
      return i;
    }
  }
  return -1;
}

export function indexToWord(index: number)
{
  if((index >= 0) && (index < targetList.length)) {
    return targetList[index];
  }
  return "";
}

export function encodeShare(target: string, firstGuess: string)
{
  const targetIndex = wordToIndex(target);
  const firstGuessIndex = wordToIndex(firstGuess);

  if((targetIndex < 0) || (firstGuessIndex < 0)) {
    return "";
  }

  return (((targetIndex & 0xffff) << 16) + (firstGuessIndex & 0xffff)).toString(16);
}

export function sharedState() : string[]
{
  const rawState = String(new URLSearchParams(window.location.search).get("share") ?? "");
  const encodedV = parseInt(rawState, 16);
  if(encodedV <= 0) {
    return [];
  }

  const targetIndex = (encodedV >> 16) & 0xffff;
  const firstGuessIndex = encodedV & 0xffff;
  let target = indexToWord(targetIndex);
  let firstGuess = indexToWord(firstGuessIndex);
  if((target.length != 5) || (firstGuess.length != 5)) {
    return [];
  }
  return [target, firstGuess];
}

// https://a11y-guidelines.orange.com/en/web/components-examples/make-a-screen-reader-talk/
export function speak(
  text: string,
  priority: "polite" | "assertive" = "assertive"
) {
  var el = document.createElement("div");
  var id = "speak-" + Date.now();
  el.setAttribute("id", id);
  el.setAttribute("aria-live", priority || "polite");
  el.classList.add("sr-only");
  document.body.appendChild(el);

  window.setTimeout(function () {
    document.getElementById(id)!.innerHTML = text;
  }, 100);

  window.setTimeout(function () {
    document.body.removeChild(document.getElementById(id)!);
  }, 1000);
}
