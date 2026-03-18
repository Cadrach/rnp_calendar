import { defineConfig } from "orval";

export default defineConfig({
  rnpCalendar: {
    input: {
      target:
        process.env.OPENAPI_URL ??
        "http://localhost/rnp_calendar/server/public/docs/api.json",
    },
    output: {
      mode: "tags-split",
      target: "./src/api/generated",
      schemas: "./src/api/generated/model",
      client: "react-query",
      override: {
        mutator: {
          path: "./src/api/axios-instance.ts",
          name: "customInstance",
        },
      },
    },
  },
});
