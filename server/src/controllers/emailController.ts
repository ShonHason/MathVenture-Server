import { Request, Response } from 'express';
import sgMail from '@sendgrid/mail';
import EmailModel from '../modules/emailModel'; // Replace with your actual email model
import dotenv from 'dotenv';
import jwt, { JwtPayload } from 'jsonwebtoken';

dotenv.config();  // Load environment variables

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  throw new Error('SENDGRID_API_KEY is not defined in environment variables');
}

const sendEmailAndSaveToDB = async (req: Request, res: Response): Promise<void> => {
  // Get the token from the Authorization header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).send('Missing token');
    return;
  }

  // Decode the JWT token
  const decodedPayload = jwt.decode(token);
  if (decodedPayload && typeof decodedPayload !== 'string') {
    const userId = (decodedPayload as JwtPayload)._id;  // Make sure this is a string

    // Validate request body
    const { subject, message, emailAddress } = req.body;

    if (!subject || !message || !emailAddress || subject.trim() === '' || message.trim() === '' || emailAddress.trim() === '') {
      res.status(400).send({ error: 'Subject, message, and email address are required' });
      return;  // Exit early if input is invalid
    }

    try {
      // Step 1: Insert email data into the database with "pending" status
      const emailData = await EmailModel.create({
        userID: userId,  // userID is passed as string
        to: emailAddress,
        subject: subject,
        message: message,
        status: 'pending',
      });

      // Step 2: Send the email using SendGrid
      const mailOptions = {
        to: emailAddress,
        from: 'MathVentureBot@gmail.com', // Use your verified SendGrid sender email
        subject: subject,
        text: message,
      };

      //await sgMail.send(mailOptions);

      // Step 3: Update the email status to "sent" in the database
      emailData.status = 'sent';
      await emailData.save();

      // Step 4: Send a success response
      res.status(200).send({
        message: 'Email sent and saved to database successfully!',
        _id: emailData._id,  // Send the email ID as part of the response
      });
      return;  // Exit after successful response
    } catch (error) {
      console.error('Error sending email:', error);

      // Step 5: Insert email data with "failed" status in case of error
      await EmailModel.create({
        to: emailAddress,
        userID: userId,  // userID is passed as string
        subject: subject,
        message: message,
        status: 'failed',
      });

      // Step 6: Send an error response
      res.status(500).send({ error: 'Failed to send email. Please try again later.' });
      return;  // Exit after error response
    }
  } else {
    res.status(401).send('Invalid token');
    return;
  }
};

const findEmailsByFilter = async (req: Request, res: Response): Promise<void> => {
  
  //check i we need many emails or one email
  const emailId = req.params._id;
  if(!emailId) {
  //get current user id from the token
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if(!token) { 
        res.status(401).send('missing token');
        return;
    }

    const decodedPayload = jwt.decode(token);
      if (decodedPayload && typeof decodedPayload !== 'string') {
        const userId = (decodedPayload as JwtPayload)._id;
          try {
            const emails = await EmailModel.find({userID :userId });
            res.status(200).send(emails);
          } catch (error) {
            console.error('Error finding emails:', error);
            res.status(500).send({ error: 'Failed to find emails.' });
          }
      }else{
        res.status(401).send('invalid token');
        return;
      }
  }else{
  try {
    const email = await EmailModel.findOne({ _id: emailId });
    if (!email||email==null) {
      res.status(404).send({ error: 'Email not found' });
      return;
    }
    res.status(200).send(email);
    }
    catch (error) {
    console.error('Error finding email:', error);
    res.status(500).send({ error: 'Failed to find email.' });
    }
  }
}




export default { sendEmailAndSaveToDB , findEmailsByFilter  };
