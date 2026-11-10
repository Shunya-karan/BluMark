
import * as service from "./academic.service.js";
import sendResponse from "../../../utils/apiResponse.js";
import catchAsync from "../../../utils/catchAsync.js";

// DEPARTMENTS

export const createDepartment = catchAsync(async (req, res) => {
  const data = await service.createDepartment(req.user, req.body);
  return sendResponse(res, 201, "Department created successfully", data);
});

export const listDepartments = catchAsync(async (req, res) => {
  const data = await service.listDepartments(req.user, req.query);
  return sendResponse(res, 200, "Departments retrieved successfully", data);
});

export const getDepartment = catchAsync(async (req, res) => {
  const data = await service.getDepartment(
    req.user,
    req.params.departmentId,
  );
  return sendResponse(res, 200, "Department retrieved successfully", data);
});

export const updateDepartment = catchAsync(async (req, res) => {
  const data = await service.updateDepartment(
    req.user,
    req.params.departmentId,
    req.body,
  );
  return sendResponse(res, 200, "Department updated successfully", data);
});

// CLASSES

export const createClass = catchAsync(async (req, res) => {
  const data = await service.createClass(req.user, req.body);
  return sendResponse(res, 201, "Class created successfully", data);
});

export const listClasses = catchAsync(async (req, res) => {
  const data = await service.listClasses(req.user, req.query);
  return sendResponse(res, 200, "Classes retrieved successfully", data);
});

export const getClass = catchAsync(async (req, res) => {
  const data = await service.getClass(req.user, req.params.classId);
  return sendResponse(res, 200, "Class retrieved successfully", data);
});

export const updateClass = catchAsync(async (req, res) => {
  const data = await service.updateClass(
    req.user,
    req.params.classId,
    req.body,
  );
  return sendResponse(res, 200, "Class updated successfully", data);
});

// SUBJECTS

export const createSubject = catchAsync(async (req, res) => {
  const data = await service.createSubject(req.user, req.body);
  return sendResponse(res, 201, "Subject created successfully", data);
});

export const listSubjects = catchAsync(async (req, res) => {
  const data = await service.listSubjects(req.user, req.query);
  return sendResponse(res, 200, "Subjects retrieved successfully", data);
});

export const getSubject = catchAsync(async (req, res) => {
  const data = await service.getSubject(req.user, req.params.subjectId);
  return sendResponse(res, 200, "Subject retrieved successfully", data);
});

export const updateSubject = catchAsync(async (req, res) => {
  const data = await service.updateSubject(
    req.user,
    req.params.subjectId,
    req.body,
  );
  return sendResponse(res, 200, "Subject updated successfully", data);
});

// TEACHER ASSIGNMENTS

export const createAssignment = catchAsync(async (req, res) => {
  const data = await service.createAssignment(req.user, req.body);
  return sendResponse(res, 201, "Teacher assigned successfully", data);
});

export const listAssignments = catchAsync(async (req, res) => {
  const data = await service.listAssignments(req.user, req.query);
  return sendResponse(res, 200, "Teacher assignments retrieved successfully", data);
});

export const getAssignment = catchAsync(async (req, res) => {
  const data = await service.getAssignment(
    req.user,
    req.params.assignmentId,
  );
  return sendResponse(res, 200, "Teacher assignment retrieved successfully", data);
});

export const reassignTeacher = catchAsync(async (req, res) => {
  const data = await service.reassignTeacher(
    req.user,
    req.params.assignmentId,
    req.body.teacherId,
  );
  return sendResponse(res, 200, "Teacher reassigned successfully", data);
});
