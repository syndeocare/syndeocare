export default {
  "apps/**/*.{js,jsx,ts,tsx}": [
    "pnpm exec eslint --fix --max-warnings 0",
    "pnpm exec prettier --write",
  ],
  "packages/**/*.{js,jsx,ts,tsx}": [
    "pnpm exec eslint --fix --max-warnings 0",
    "pnpm exec prettier --write",
  ],
  "*.{js,cjs,mjs,jsx,ts,tsx,json,md,mdx,yml,yaml}": [
    "pnpm exec prettier --write",
  ],
};
