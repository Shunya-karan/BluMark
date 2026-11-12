
import authOpenApi from "../modules/auth/auth.swagger.js";
import studentOpenApi from "../modules/students/student.swagger.js";
import teacherOpenApi from "../modules/teachers/teacher.swagger.js";
import adminOpenApi from "../modules/admin/admin.swagger.js";
import academicOpenApi from "../modules/admin/academics/academic.swagger.js";
import userOpenApi from "../modules/admin/users/user.swagger.js";
import deviceOpenApi from "../modules/admin/devices/device.swagger.js";
import notificationOpenApi from "../modules/admin/notifications/notification.swagger.js";

export default {
  ...authOpenApi,

  info: {
    ...authOpenApi.info,
    title: "Blu-Mark API",
  },

  tags: [
    ...authOpenApi.tags,
    ...studentOpenApi.tags,
    ...teacherOpenApi.tags,
    ...adminOpenApi.tags,
    ...academicOpenApi.tags,
    ...userOpenApi.tags,
    ...notificationOpenApi.tags,


  ],

  paths: {
    ...authOpenApi.paths,
    ...studentOpenApi.paths,
    ...teacherOpenApi.paths,
    ...adminOpenApi.paths,
    ...academicOpenApi.paths,
    ...userOpenApi.paths,
    ...deviceOpenApi.paths,
    ...notificationOpenApi.paths,

  },

  components: {
    ...authOpenApi.components,

    schemas: {
      ...authOpenApi.components.schemas,
      ...studentOpenApi.components.schemas,
      ...teacherOpenApi.components.schemas,
      ...adminOpenApi.components.schemas,
      ...academicOpenApi.components.schemas,
      ...userOpenApi.components.schemas,
      ...deviceOpenApi.components.schemas,
      ...notificationOpenApi.components.schemas,

    },
  },
};
