import request from "supertest";
import appInit from "../server";
import mongoose, { Mongoose } from "mongoose";
import { Express } from "express";
import userModel from "../modules/userModel";

import lessonsModel from "../modules/lessonsModel";
import { progressType } from "../modules/enum/progress";
import { MathTopics } from "../modules/enum/EducationalTopics";

let app: Express;
let userTestId: string = "";
let lessonTestId: string = "";
const getLessonTest = (): LessonsType => ({
  userId: userTestId,
  startTime: new Date(),
  endTime: new Date(),
  progress: progressType.NOT_STARTED,
  subject: MathTopics.Grade1_AdditionSubtraction,
});

beforeAll(async () => {
  app = await appInit.initApplication();
  await userModel.deleteMany(); // Ensure this operation is awaited
  await lessonsModel.deleteMany(); // Ensure this operation is awaited
  const savedUser = await userModel.create(userTest);
  if (!savedUser) {
    throw new Error("Failed to create user");
  }
  userTestId = savedUser._id.toString();
});

afterAll(async () => {
  await mongoose.connection.close(); // Close the database connection asynchronously
});
type UserInfo = {
  email: string;
  password: string;
  name: string;
  grade: string;
  _id?: string;
  parent_email: string;
  parent_phone: string;
  accessToken?: string;
  refreshToken?: string;
  dateOfBirth: string;
};

const userTest: UserInfo = {
  email: "ShonHason4@gmail.com",
  password: "05040504",
  name: "Shon Hason",
  grade: "א",
  parent_email: "myParent@gmail.com",
  parent_phone: "0504809042",
  dateOfBirth: "1997-04-27",
};

type LessonsType = {
  userId: string;
  startTime: Date;
  endTime: Date;
  progress: progressType;
  subject: MathTopics;
};

describe("basic route tests", () => {
  test("Creating Lesson", async () => {
    const lessonTest = getLessonTest();
    const response = await request(app).post("/lessons/").send({
      userId: lessonTest.userId,
      startTime: lessonTest.startTime,
      endTime: lessonTest.endTime,
      progress: lessonTest.progress,
      subject: lessonTest.subject,
    });
    lessonTestId = response.body._id.toString();
    expect(response.status).toEqual(201);
    expect(response.body.userId).toEqual(userTestId);
    expect(response.body.progress).toEqual(progressType.NOT_STARTED);
    expect(response.body.subject).toEqual(
      MathTopics.Grade1_AdditionSubtraction
    );
    expect(response.body.endTime).toBeDefined();
    expect(response.body.startTime).toBeDefined();
  });

  test("get all lessons", async () => {
    const response = await request(app).get("/lessons/");
    expect(response.status).toEqual(200);
    expect(response.body.length).toEqual(1);
    expect(response.body[0].userId).toEqual(userTestId);
  });

  test("get lesson by id", async () => {
    console.log(lessonTestId);
    const response = await request(app).get(`/lessons/${lessonTestId}`);

    expect(response.status).toEqual(200);
  });

  test("update end time lesson", async () => {
    const newEndTime = new Date();
    const response = await request(app)
      .patch(`/lessons/${lessonTestId}`)
      .send({ endTime: newEndTime });
    expect(response.status).toEqual(200);
  });

  test("get lesson by user id", async () => {
    const response = await request(app).get(`/lessons/users/${userTestId}`);
    expect(response.status).toEqual(200);
  });

  test("delete lesson", async () => {
    const response = await request(app).delete(`/lessons/${lessonTestId}`);
    expect(response.status).toEqual(200);
  });
});
