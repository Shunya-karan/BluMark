
import catchAsync from "../../../utils/catchAsync.js";
import sendResponse from "../../../utils/apiResponse.js";
import * as service from "./user.service.js";

export const listStudents = catchAsync(async (req, res) => {
  const data = await service.listStudents(req.user, req.query);

  return sendResponse(
    res,
    200,
    "Students retrieved successfully",
    data,
  );
});

export const getStudent = catchAsync(async (req, res) => {
  const data = await service.getStudent(
    req.user,
    req.params.profileId,
  );

  return sendResponse(
    res,
    200,
    "Student details retrieved successfully",
    data,
  );
});

export const listTeachers = catchAsync(async (req, res) => {
  const data = await service.listTeachers(req.user, req.query);

  return sendResponse(
    res,
    200,
    "Teachers retrieved successfully",
    data,
  );
});

export const getTeacher = catchAsync(async (req, res) => {
  const data = await service.getTeacher(
    req.user,
    req.params.profileId,
  );

  return sendResponse(
    res,
    200,
    "Teacher details retrieved successfully",
    data,
  );
});

export const updateUserStatus = catchAsync(async (req, res) => {
  const data = await service.updateUserStatus(
    req.user,
    req.params.profileId,
    req.body.isActive,
  );

  return sendResponse(
    res,
    200,
    data.changed
      ? "User status updated successfully"
      : "User status is already up to date",
    data,
  );
});

export const getStudentEnrollment = catchAsync(async (req, res) => {
  const data = await service.getStudentEnrollment(
    req.user,
    req.params.profileId,
  );

  return sendResponse(
    res,
    200,
    "Student enrollment retrieved successfully",
    data,
  );
});

export const assignStudentEnrollment = catchAsync(async (req, res) => {
  const data = await service.assignStudentEnrollment(
    req.user,
    req.params.profileId,
    req.body.classId,
  );

  return sendResponse(
    res,
    200,
    "Student enrollment updated successfully",
    data,
  );
});
