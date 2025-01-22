![full logo](https://github.com/user-attachments/assets/0c1353dd-76bd-40e2-94a9-82c14845ed0e)

# MathVenture

# Project Setup and Installation Guide

Follow the steps below to run the app locally.

## 1. Install Dependencies

First, clone the repository to your local machine.

## 2. Next, install the necessary dependencies:

yarn install

## 3. Install Additional Packages:

Install the required packages for the project:

yarn add react-scripts

yarn add @google-cloud/speech microphone-stream

yarn add -D @types/microphone-stream

yarn add react-pro-sidebar

## 4. Install Additional Packages:

If you are encountering issues with the newer versions of react-pro-sidebar, install version 8.0.0:

yarn add react-pro-sidebar@8.0.0

ALSO ENTER SERVER PACKAGE AND INSTALL:this is for swagger
npm i --save-dev swagger-jsdoc
npm i --save-dev swagger-ui-express

or if youre using yarn so just

yarn add --save-dev swagger-jsdoc
yarn add --save-dev swagger-ui-express

Alternatively, if you need to install version 0.7.1 specifically, you can run:

yarn add react-pro-sidebar@7.1

## 5. Start the Application

Once everything is installed, start the app by running:
yarn dev
This will start the development server, and you should be able to view the app in your browser at http://localhost:3000.
