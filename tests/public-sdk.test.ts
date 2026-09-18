import { expect, test } from "bun:test";
import { experimental_scanPublicSdkOnly } from "@get-bb/plugin-sdk/testing";
import { resolve } from "node:path";
test("production and test code use only public SDK and declared dependencies", () => {
 const result = experimental_scanPublicSdkOnly(resolve(import.meta.dir, ".."), { allow: [/^bun:test$/, /^yaml$/, /^react(?:\/.*)?$/, /^react-markdown$/, /^remark-gfm$/, /^rehype-highlight$/, /^@happy-dom\/global-registrator$/, /^@testing-library\/react$/] });
 expect(result.privateDependencies).toEqual([]);
 expect(result.violations).toEqual([]);
});
