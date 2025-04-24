import { Request, Response } from 'express';
import sgMail from '@sendgrid/mail';
import EmailModel from '../modules/emailModel';
import jwt, { JwtPayload } from 'jsonwebtoken';

// Move SendGrid setup into a function, not at top-level
function initializeSendGrid() {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    throw new Error("SENDGRID_API_KEY is not defined in environment variables");
  }
  sgMail.setApiKey(apiKey);
  console.log("✅ SendGrid API key is set");
}

const sendEmailAndSaveToDB = async (req: Request, res: Response): Promise<void> => {
  try {
    initializeSendGrid(); // Initialize only when needed

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).send('Missing token');
      return;
    }

    const decodedPayload = jwt.decode(token);
    if (!decodedPayload || typeof decodedPayload === 'string') {
      res.status(401).send('Invalid token');
      return;
    }

    const userId = (decodedPayload as JwtPayload)._id;
    const { subject, message, emailAddress } = req.body;

    if (!subject || !message || !emailAddress || subject.trim() === '' || message.trim() === '' || emailAddress.trim() === '') {
      res.status(400).send({ error: 'Subject, message, and email address are required' });
      return;
    }

    const emailData = await EmailModel.create({
      userID: userId,
      to: emailAddress,
      subject,
      message,
      status: 'pending',
    });

    const mailOptions = {
      to: emailAddress,
      from: 'MathVentureBot@gmail.com',
      subject,
      text: message,
    };

    await sgMail.send(mailOptions);

    emailData.status = 'sent';
    await emailData.save();

    res.status(200).send({
      message: 'Email sent and saved to database successfully!',
      _id: emailData._id,
    });
  } catch (error) {
    console.error('Error sending email:', error);

    // Fallback to saving failed status
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    const decodedPayload = token ? jwt.decode(token) : null;
    const userId = decodedPayload && typeof decodedPayload !== 'string'
      ? (decodedPayload as JwtPayload)._id
      : undefined;

    if (userId) {
      await EmailModel.create({
        to: req.body?.emailAddress,
        userID: userId,
        subject: req.body?.subject,
        message: req.body?.message,
        status: 'failed',
      });
    }

    res.status(500).send({ error: 'Failed to send email. Please try again later.' });
  }
};

const findEmailsByFilter = async (req: Request, res: Response): Promise<void> => {
  const emailId = req.params._id;

  if (!emailId) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).send('Missing token');
      return;
    }

    const decodedPayload = jwt.decode(token);
    if (!decodedPayload || typeof decodedPayload === 'string') {
      res.status(401).send('Invalid token');
      return;
    }

    const userId = (decodedPayload as JwtPayload)._id;

    try {
      const emails = await EmailModel.find({ userID: userId });
      res.status(200).send(emails);
    } catch (error) {
      console.error('Error finding emails:', error);
      res.status(500).send({ error: 'Failed to find emails.' });
    }
  } else {
    try {
      const email = await EmailModel.findOne({ _id: emailId });
      if (!email) {
        res.status(404).send({ error: 'Email not found' });
        return;
      }
      res.status(200).send(email);
    } catch (error) {
      console.error('Error finding email:', error);
      res.status(500).send({ error: 'Failed to find email.' });
    }
  }
};

export default {
  sendEmailAndSaveToDB,
  findEmailsByFilter,
};
