const nodemailer = require("nodemailer");

// Create Gmail Transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: process.env.SMTP_PORT || 587,
    secure: false, // TLS
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// Send OTP Email - Shows in console AND sends to email
const sendOTP = async (email, otp) => {
  // ALWAYS show OTP in console
  console.log("═══════════════════════════════════════════");
  console.log("📧 OTP FOR:", email);
  console.log("🔐 OTP:", otp);
  console.log("═══════════════════════════════════════════");
  
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"FoodShare" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Your FoodShare OTP Verification",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
          <div style="background:#2E7D32; padding:20px; text-align:center;">
            <h1 style="color:white;">FoodShare</h1>
          </div>
          <div style="padding:30px; background:#f5f5f5;">
            <h2>Email Verification</h2>
            <p>Your OTP is:</p>
            <div style="background:white; padding:20px; text-align:center; border-radius:8px;">
              <span style="font-size:32px; font-weight:bold; color:#2E7D32;">
                ${otp}
              </span>
            </div>
            <p style="font-size:14px; color:#666;">Valid for 10 minutes.</p>
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("✅ OTP Email sent:", info.messageId);
    return { success: true, otp };
  } catch (error) {
    console.error("❌ OTP Email Error:", error.message);
    console.log("📧 OTP still available in console above");
    return { success: true, otp, simulated: true };
  }
};

// Send Donation Confirmation
const sendDonationConfirmation = async (donor, receiver, donation) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"FoodShare" <${process.env.SMTP_USER}>`,
      to: donor.email,
      subject: `Donation Accepted by ${receiver.organizationName}`,
      html: `
        <div style="font-family: Arial; max-width:600px; margin:auto;">
          <div style="background:#2E7D32; padding:20px; text-align:center;">
            <h1 style="color:white;">Donation Accepted</h1>
          </div>
          <div style="padding:30px; background:#f5f5f5;">
            <h3>Donation Details</h3>
            <p><b>Food:</b> ${donation.foodName}</p>
            <p><b>Quantity:</b> ${donation.quantity} ${donation.unit}</p>
            <p><b>Pickup ID:</b> ${donation.pickupId}</p>
            <p><b>Pickup Address:</b> ${donation.address?.street || ''}, ${donation.address?.city || ''}, ${donation.address?.state || ''} ${donation.address?.zipCode || ''}</p>
            <p><b>Landmark:</b> ${donation.address?.landmark || 'Not specified'}</p>

            <h3>Receiver</h3>
            <p><b>Organization:</b> ${receiver.organizationName}</p>
            <p><b>Contact:</b> ${receiver.name}</p>
            <p><b>Phone:</b> ${receiver.phone}</p>
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("Donation confirmation sent:", info.messageId);
    return { success: true };
  } catch (error) {
    console.error("Confirmation Email Error:", error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendOTP,
  sendDonationConfirmation,
  sendNewDonationNotification: async (receiver, donation, donor) => {
    try {
      const transporter = createTransporter();
      const mailOptions = {
        from: `"FoodShare" <${process.env.SMTP_USER}>`,
        to: receiver.email,
        subject: `🍽️ New Food Donation Available: ${donation.foodName}`,
        html: `
          <div style="font-family: Arial; max-width:600px; margin:auto;">
            <div style="background:#FF6F00; padding:20px; text-align:center;">
              <h1 style="color:white;">New Donation Available!</h1>
            </div>
            <div style="padding:30px; background:#f5f5f5;">
              <h3>Donation Details</h3>
              <p><b>Food Item:</b> ${donation.foodName}</p>
              <p><b>Quantity:</b> ${donation.quantity} ${donation.unit}</p>
              <p><b>Food Type:</b> ${donation.foodType}</p>
              <p><b>Donor:</b> ${donor.organizationName}</p>
              <p><b>Location:</b> ${donation.address?.street || ''}, ${donation.address?.city || ''}, ${donation.address?.state || ''} ${donation.address?.zipCode || ''}</p>
              <p><b>Landmark:</b> ${donation.address?.landmark || 'Not specified'}</p>
            </div>
          </div>
        `,
      };
      const info = await transporter.sendMail(mailOptions);
      console.log("Donation notification sent:", info.messageId);
      return { success: true };
    } catch (error) {
      console.error("Notification Email Error:", error);
      return { success: false, error: error.message };
    }
  },
  sendThankYouEmail: async (donor, receiver, donation) => {
    try {
      const transporter = createTransporter();
      const mailOptions = {
        from: `"FoodShare" <${process.env.SMTP_USER}>`,
        to: donor.email,
        subject: "🙏 Thank You for Your Donation!",
        html: `
          <div style="font-family: Arial; max-width:600px; margin:auto;">
            <div style="background:#FF6F00; padding:20px; text-align:center;">
              <h1 style="color:white;">Thank You!</h1>
            </div>
            <div style="padding:30px; background:#f5f5f5;">
              <p>${receiver.organizationName} has picked up your donation.</p>
              <p><b>Food:</b> ${donation.foodName}</p>
              <p>Thank you for being part of FoodShare!</p>
            </div>
          </div>
        `,
      };
      const info = await transporter.sendMail(mailOptions);
      console.log("Thank you email sent:", info.messageId);
      return { success: true };
    } catch (error) {
      console.error("Thank You Email Error:", error);
      return { success: false, error: error.message };
    }
  },
  // Send pickup details to receiver when they accept donation
  sendPickupDetailsToReceiver: async (receiver, donation, donor) => {
    try {
      const transporter = createTransporter();
      const mailOptions = {
        from: `"FoodShare" <${process.env.SMTP_USER}>`,
        to: receiver.email,
        subject: `🎉 Donation Accepted! Pickup ID: ${donation.pickupId}`,
        html: `
          <div style="font-family: Arial; max-width:600px; margin:auto;">
            <div style="background:#2E7D32; padding:20px; text-align:center;">
              <h1 style="color:white;">Pickup Details</h1>
            </div>
            <div style="padding:30px; background:#f5f5f5;">
              <div style="background:white; padding:20px; border-radius:10px; text-align:center; margin:20px 0;">
                <p style="font-size:14px; color:#666; margin-bottom:5px;">Your Pickup ID</p>
                <span style="font-size:36px; font-weight:bold; color:#FF6F00; letter-spacing:4px;">${donation.pickupId}</span>
              </div>
              
              <h3>Donation Details</h3>
              <p><b>Food Item:</b> ${donation.foodName}</p>
              <p><b>Quantity:</b> ${donation.quantity} ${donation.unit}</p>
              <p><b>Food Type:</b> ${donation.foodType}</p>
              
              <h3>Pickup Location</h3>
              <p><b>Organization:</b> ${donor.organizationName}</p>
              <p><b>Address:</b> ${donor.address?.street || ''}, ${donor.address?.city || ''}, ${donor.address?.state || ''}</p>
              <p><b>Landmark:</b> ${donor.address?.landmark || 'Not specified'}</p>
              
              <p style="color:#666; font-size:14px; margin-top:20px;">📌 Show this Pickup ID to the donor when you go for pickup.</p>
            </div>
          </div>
        `,
      };
      const info = await transporter.sendMail(mailOptions);
      console.log("Pickup details sent to receiver:", info.messageId);
      return { success: true };
    } catch (error) {
      console.error("Pickup Details Email Error:", error);
      return { success: false, error: error.message };
    }
  },
};
