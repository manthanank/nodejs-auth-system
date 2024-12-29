const nodemailer = require("nodemailer");
require("dotenv").config();
const { log, error: logError } = require("../utils/logger");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_MAIL,
    pass: process.env.SMTP_APP_PASS,
  },
});

const sendEmail = async (email, subject, content) => {
  const mailOptions = {
    from: process.env.SMTP_MAIL,
    to: email,
    subject,
    html: content,
  };

  try {
    console.log(mailOptions);
    await transporter.sendMail(mailOptions);
    log(`Email sent to ${email}`);
  } catch (err) {
    logError(`Email not sent: ${err}`);
  }
};

module.exports = { sendEmail };
