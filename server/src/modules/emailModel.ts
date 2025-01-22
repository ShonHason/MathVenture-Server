
import mongoose,{Schema,Document} from "mongoose";

interface iEmail extends Document{ 
    userID: string; // The user ID associated with the email
    to: string;
    subject: string;
    message: string;
    status: string;  // For tracking the email status (sent, failed, etc.)
    createdAt: Date;
}   
const emailSchema = new Schema<iEmail>({
    userID: { type: String, required: true },
    to: { type: String, required: true },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    status: { type: String, default: 'pending' }, // Pending initially
    createdAt: { type: Date, default: Date.now },
}); 
const EmailModel = mongoose.model("emailSent", emailSchema);
export default EmailModel;
