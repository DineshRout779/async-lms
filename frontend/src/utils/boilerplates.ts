import type { PlaygroundFile } from "./types";

export const BOILERPLATES: Record<string, PlaygroundFile[]> = {
  javascript: [
    {
      path: "index.js",
      content: `
// Entry file
const math = require("./src/utils/math");

console.log("Result:", math.add(2, 3));
`,
    },
    {
      path: "src/utils/math.js",
      content: `
exports.add = (a, b) => a + b;
`,
    },
  ],

  python: [
    {
      path: "main.py",
      content: `
from src.utils.math import add

print("Result:", add(2, 3))
`,
    },
    {
      path: "src/utils/math.py",
      content: `
def add(a, b):
    return a + b
`,
    },
  ],
};
