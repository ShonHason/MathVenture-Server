import request from "supertest";
import appInit from "../server";
import mongoose from "mongoose";
import e, { Express } from "express";
import jwt, { JwtPayload } from 'jsonwebtoken';
import userModel from "../modules/userModel";
import { access } from "fs";
import emailModel from "../modules/emailModel"
let app: Express;


beforeAll(async () => {
    app = await appInit.initApplication();
//    await emailModel.deleteMany();
    await userModel.deleteMany(); // Ensure this operation is awaited
    
    const response = await request(app).post('/user/register').send(userTest);
    userTest._id = response.body._id;
    userTest.accessToken = response.body.accessToken;
    userTest.refreshToken = response.body.refreshToken;
});

afterAll(async () => {
    await mongoose.connection.close(); // Close the database connection asynchronously
});
type UserInfo = {
    email: string;
    password: string;
    name:string;
    grade: string;
    _id?: string;
    parent_email: string;
    parent_phone: string;
    accessToken?: string;
    refreshToken?: string;
    dateOfBirth: string;
  };
  const userTest : UserInfo = {
    email: 'rotem11ziv11@gmail.com',
    password: '40405080',
    name: 'Moshe Levi',
    grade: 'א',
    parent_email: 'shonHason4@gmail.com',
    parent_phone: "0000000test",
    dateOfBirth: "1997-04-27"
};
type emailInfo = {
    subject: string;
    message: string;
    emailAddress: string;
    _id?: string;
};
const emailTest : emailInfo = {
    subject: 'Test Email',
    message: 'This is a test email',
    emailAddress: userTest.parent_email
};

describe('email api', () => {
    test('Sending Email and saving in Db', async () => {
        const response = await request(app).post('/email/sendMail').set({
            Authorization: "jwt " + userTest.accessToken
        }).send({
            subject: 'Shon HI',
            message: 'This SHON email',
            emailAddress: userTest.parent_email   
        }); 
        emailTest._id = response.body._id;
        console.log(response.body);
        expect(response.status).toEqual(200);
        expect(response.body.message).toEqual('Email sent and saved to database successfully!');
    });

    test('Sending Email and saving in Db with missing token', async () => {
        const response = await request(app).post('/email/sendMail').send({
            subject: 'Test Second Email',
            message: 'This is a test email',
            emailAddress: userTest.email    
        }); 
        console.log(response.body);
        expect(response.status).toEqual(401);
        expect(response.text).toEqual('missing token');
    });

    test('Sending Email and saving in Db with missing subject', async () => {
        const response = await request(app).post('/email/sendMail').set({
            Authorization: "jwt " + userTest.accessToken
        }).send({
            message: 'This is a test email',
            emailAddress: userTest.email    
        }); 
        console.log(response.body);
        expect(response.status).toEqual(400);
        expect(response.body.error).toEqual('Subject, message, and email address are required');
    });

    test("Getting all emails", async () => {
        const response = await request(app).get('/email/getUserMail/').set({
            Authorization: "jwt " + userTest.accessToken
        }).send();
        console.log(response.body);
        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();
    });
    test("getting an specific mail", async () => {
        const response = await request(app).get('/email/getUserMail/' + emailTest._id).set({
            authorization: "jwt " + userTest.accessToken
        });
        console.log(response.body);
        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();
    });
    test("getting an specific mail with fake email id", async () => {
        const response = await request(app).get('/email/getUserMail/' + '677e79fd80b314caa320e19b').set({
            authorization: "jwt " + userTest.accessToken
        });
        console.log(response.body);
        expect(response.status).toEqual(404);
        expect(response.body.error).toEqual('Email not found');
    });
});  