import authOpenApi from "../modules/auth/auth.swagger.js";
import studentOpenApi from "../modules/students/student.swagger.js";

export default {
  ...authOpenApi,
  info: {
    ...authOpenApi.info,
    title: "Blu-Mark API",
  },
  tags: [...authOpenApi.tags, ...studentOpenApi.tags],
  paths: { ...authOpenApi.paths, ...studentOpenApi.paths },
  components: {
    ...authOpenApi.components,
    schemas: { ...authOpenApi.components.schemas, ...studentOpenApi.components.schemas },
  },
};
