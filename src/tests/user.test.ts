import request from "supertest";
import appInit from "../server";
import mongoose from "mongoose";
import e, { Express } from "express";
import jwt, { JwtPayload } from 'jsonwebtoken';
import userModel from "../modules/userModel";
let app: Express;

beforeAll(async () => {
    app = await appInit.initApplication();
    await userModel.deleteMany(); // Ensure this operation is awaited
    
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
    email: 'ShonHason4@gmail.com',
    password: '05040504',
    name: 'Shon Hason',
    grade: 'א',
    parent_email: 'myParent@gmail.com',
    parent_phone: "0504809042",
    dateOfBirth: "1997-04-27"
};

describe('basic route tests', () => {
    test('Creating User', async () => {
        const response = await request(app).post('/user/register').send({
            email: userTest.email,
            password: userTest.password,
            name: userTest.name,
            grade: userTest.grade,
            parent_email: userTest.parent_email,
            parent_phone: userTest.parent_phone,
            dateOfBirth: userTest.dateOfBirth
        });
        console.log(response.body);

        expect(response.status).toEqual(201);
        expect(response.body.accessToken).toBeDefined();
        expect(response.body.refreshToken).toBeDefined();
        userTest.accessToken = response.body.accessToken;
        userTest.refreshToken = response.body.refreshToken;
        console.log("*****"+response.body.refreshToken+"*****");
        userTest._id = response.body._id;
        console.log(response.body);
    });

    test('Try create same user', async () => {
        const response = await request(app).post('/user/register').send({
            email: 'ShonHason4@gmail.com',
            password: '1234',
            name: 'Shon',
            grade: 'א',
            parent_email: 'myParent@gmail.com',
            parent_phone: "",
            dateOfBirth: "1997-04-27"});
        expect(response.status).toEqual(400);
        expect(response.text).toEqual('User already exists');
        });
    test('Try create user with missing fields', async () => {
        const response = await request(app).post('/user/register').send({
            email: '    ',
            password: '1234',
            name: 'Shon',
            grade: 'א',
            parent_email: '   ',
            parent_phone: "",
            dateOfBirth: "1997-04-27"});
        expect(response.status).toEqual(400);
        expect(response.text).toEqual('Email and password are required');
    });
    test('Login', async () => {
        const response = await request(app).post('/user/login').send({
            email: "ShonHason4@gmail.com",
            password: "05040504"
        });
        expect(response.status).toEqual(200);
        expect(response.body.accessToken).toBeDefined();
        expect(response.body.refreshToken).toBeDefined();
        userTest.accessToken = response.body.accessToken;
        const decodedPayload = jwt.decode(response.body.accessToken);

        if (decodedPayload && typeof decodedPayload !== 'string') {
            const userId = (decodedPayload as JwtPayload)._id;  // Type assertion
            console.log('User ID from Access Token:', userId);
        } else {
            console.log('Decoded token is not valid or is a string.');
        }

        console.log("*****"+response.body.refreshToken+"*****");
        userTest.refreshToken = response.body.refreshToken;
    
    
    });
    test('Login with wrong password', async () => {
        const response = await request(app).post('/user/login').send({
            email: "ShonHason4@gmail.com",
            password: "1234"
        });
        expect(response.status).toEqual(400);
        expect(response.text).toEqual('Invalid Email Or Password');})
    
    test('Login with wrong email', async () => {
        const response = await request(app).post('/user/login').send({
            email: "shsh@gmail.com",
            password: "1234"
        });
        expect(response.status).toEqual(400);
        expect(response.text).toEqual('Invalid Email Or Password');
    });
    test("logout", async () => {
        const response = await request(app).post('/user/logout').send({
            refreshToken: userTest.refreshToken
        });
        console.log(response.body);
        expect(response.status).toEqual(200);
        expect(response.text).toEqual('Logged out');
    });
    test("logout with wrong refreshToken", async () => {
        const response = await request(app).post('/user/logout').send({
            refreshToken: userTest.refreshToken+'1'
        }); 
        expect(response.status).toEqual(400);
        expect(response.text).toEqual('Invalid Token');
    });
   
});