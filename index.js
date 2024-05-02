const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const path = require('path');

const app = express();

app.use(bodyParser.json());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({
    extended: true
}));

mongoose.connect('mongodb://localhost:27017/Database', { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Error in Connecting to Database'));
db.once('open', () => console.log("Connected to Database"));

// Define MongoDB Schemas for signup and login
const signupSchema = new mongoose.Schema({
    name: String,
    age: Number,
    email: String,
    phno: String,
    gender: String,
    password: String
});
const Signup = mongoose.model('Signup', signupSchema);// Define MongoDB Schema for login
var loginSchema = new mongoose.Schema({
    email: String,
    password: String
});

// Create MongoDB Model for login
var Login = mongoose.model('Login', loginSchema);


// Signup Route
app.post("/sign_up", async (req, res) => {
    try {
        const { name, age, email, phno, gender, password } = req.body;

        // Check if the email or phone number already exists in the database
        const existingUser = await Signup.findOne({ $or: [{ email: email }, { phno: phno }] });
        if (existingUser) {
            return res.status(400).send("User with this email or phone number already exists");
        }

        // Create a new user
        const newUser = await Signup.create({
            name: name,
            age: age,
            email: email,
            phno: phno,
            gender: gender,
            password: password
        });

        console.log("Signup Successful");
        // Redirect to the signup successful page
        return res.redirect('/signup_successful.html');
    } catch (err) {
        console.error(err);
        return res.status(500).send("Error in signup. Please try again.");
    }
});

// Login Route
app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find the user in the signups collection
        const user = await Signup.findOne({ email: email, password: password });

        if (!user) {
            // User not found in signups, handle accordingly (e.g., redirect to login page)
            return res.status(404).send("User not found");
        }

        // User found in signups, check if they exist in logins
        const existingUser = await Login.findOne({ email: email });

        if (!existingUser) {
            // If user doesn't exist in logins, add them
            await Login.create({ email: email, password: password });
        }

        // User found, redirect to login success page
        return res.redirect('/login_successful.html');
    } catch (err) {
        // Handle errors
        console.error(err);
        return res.status(500).send("Internal Server Error");
    }
});

// Password Reset Route
app.post("/forgot_password", async (req, res) => {
    try {
        const { email } = req.body;

        // Find the user in the signups collection
        const user = await Signup.findOne({ email: email });

        if (!user) {
            // User not found
            return res.status(404).send("User not found");
        }

        // Generate a unique token for password reset (you can use crypto or any library)
        const resetToken = generateResetToken();

        // Save the token to the user document in the database
        user.resetToken = resetToken;
        await user.save();

        // Send an email to the user with the reset link containing the token
        await sendResetEmail(email, resetToken);

        // Redirect to a page indicating that the reset link has been sent
        return res.redirect('/reset_link_sent.html');
    } catch (err) {
        console.error(err);
        return res.status(500).send("Internal Server Error");
    }
});

// Function to generate a unique reset token (dummy implementation)
function generateResetToken() {
    // Generate a random token using any method (e.g., crypto library)
    return Math.random().toString(36).substr(2, 8);
}

// Function to send reset email (dummy implementation)
async function sendResetEmail(email, resetToken) {
    // Create a nodemailer transporter using SMTP or other options
    let transporter = nodemailer.createTransport({
        // Configuration options (e.g., host, port, auth)
    });

    // Setup email data
    let mailOptions = {
        from: 'your-email@example.com',
        to: email,
        subject: 'Password Reset',
        text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
            'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
            `http://localhost:3001/reset_password?token=${resetToken}\n\n` +
            'If you did not request this, please ignore this email and your password will remain unchanged.\n'
    };

    // Send mail with defined transport object
    await transporter.sendMail(mailOptions);
}

app.listen(3001, () => {
    console.log("Listening on port 3001");
});
