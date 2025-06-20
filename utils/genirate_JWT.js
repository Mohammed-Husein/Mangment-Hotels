const jwt = require("jsonwebtoken");

module.exports = async (payload) => {
  try {
    // إضافة تاريخ التوليد إلى payload
    const tokenPayload = {
      ...payload,
      'generate-date': new Date().toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).replace(/(\d+)\/(\d+)\/(\d+),\s(\d+):(\d+):(\d+)/, '$3/$1/$2 $4:$5:$6'),
      'iss': 'Issuer',
      'aud': 'Audience'
    };

    const token = await jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET_KEY,
      { expiresIn: "10d" }
    );
    return token;
  } catch (error) {
    console.error("Error generating token:", error);
    throw new Error("Failed to generate token");
  }
};