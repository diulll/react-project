import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import pool from '../config/database.js';

const router = express.Router();

// Store untuk reset codes (dalam production, gunakan database atau Redis)
const resetCodes = new Map();

// Konfigurasi Nodemailer untuk Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // Email Gmail kamu
    pass: process.env.EMAIL_PASS  // App Password Gmail (bukan password biasa)
  }
});

// Fungsi untuk mengirim email reset password
const sendResetEmail = async (toEmail, resetCode, fullname) => {
  const mailOptions = {
    from: `"BelajarReact App" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: '🔐 Reset Password - BelajarReact App',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #102770, #1f2029); padding: 30px; border-radius: 10px; text-align: center;">
          <h1 style="color: #ffeba7; margin: 0;">Reset Password</h1>
        </div>
        <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: #333;">Halo <strong>${fullname}</strong>,</p>
          <p style="font-size: 14px; color: #666;">Kami menerima permintaan untuk mereset password akun Anda. Gunakan kode berikut untuk mereset password:</p>
          <div style="background-color: #102770; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; color: #ffeba7; letter-spacing: 8px;">${resetCode}</span>
          </div>
          <p style="font-size: 14px; color: #666;">Kode ini berlaku selama <strong>15 menit</strong>.</p>
          <p style="font-size: 14px; color: #666;">Jika Anda tidak meminta reset password, abaikan email ini.</p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          <p style="font-size: 12px; color: #999; text-align: center;">© 2026 BelajarReact App. All rights reserved.</p>
        </div>
      </div>
    `
  };

  return transporter.sendMail(mailOptions);
};

// Middleware untuk verifikasi token
export const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Token tidak ditemukan' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      message: 'Token tidak valid' 
    });
  }
};

// Sign Up
router.post('/signup', async (req, res) => {
  try {
    const { fullname, email, password } = req.body;

    // Validasi input
    if (!fullname || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Semua field harus diisi!' 
      });
    }

    // Cek apakah email sudah terdaftar
    const [existingUsers] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email sudah terdaftar!' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user baru
    const [result] = await pool.query(
      'INSERT INTO users (fullname, email, password) VALUES (?, ?, ?)',
      [fullname, email, hashedPassword]
    );

    // Generate JWT token
    const token = jwt.sign(
      { id: result.insertId, email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      message: 'Registrasi berhasil!',
      data: {
        id: result.insertId,
        fullname,
        email,
        token
      }
    });
  } catch (error) {
    console.error('Error signup:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Gagal melakukan registrasi' 
    });
  }
});

// Log In
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validasi input
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email dan password harus diisi!' 
      });
    }

    // Cari user berdasarkan email
    const [users] = await pool.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Email atau password salah!' 
      });
    }

    const user = users[0];

    // Verifikasi password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Email atau password salah!' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login berhasil!',
      data: {
        id: user.id,
        fullname: user.fullname,
        email: user.email,
        token
      }
    });
  } catch (error) {
    console.error('Error login:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Gagal melakukan login' 
    });
  }
});

// Get Profile (protected route)
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, fullname, email, created_at FROM users WHERE id = ?',
      [req.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User tidak ditemukan' 
      });
    }

    res.json({
      success: true,
      data: users[0]
    });
  } catch (error) {
    console.error('Error get profile:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Gagal mengambil data profil' 
    });
  }
});

// Forgot Password - Request reset code
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    // Validasi input
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email harus diisi!' 
      });
    }

    // Cari user berdasarkan email
    const [users] = await pool.query(
      'SELECT id, fullname, email FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Email tidak ditemukan!' 
      });
    }

    // Generate reset code (6 digit)
    const resetCode = crypto.randomInt(100000, 999999).toString();
    
    // Simpan reset code dengan expiry 15 menit
    resetCodes.set(email, {
      code: resetCode,
      expiry: Date.now() + 15 * 60 * 1000, // 15 menit
      userId: users[0].id
    });

    // Kirim email dengan reset code
    try {
      await sendResetEmail(email, resetCode, users[0].fullname);
      console.log(`✅ Reset code sent to ${email}`);
    } catch (emailError) {
      console.error('❌ Gagal mengirim email:', emailError.message);
      // Tetap tampilkan di console sebagai fallback
      console.log('=================================');
      console.log(`Reset code for ${email}: ${resetCode}`);
      console.log('=================================');
    }

    res.json({
      success: true,
      message: 'Kode reset telah dikirim ke email Anda!',
      // Hanya untuk demo - hapus di production!
      resetCode: resetCode 
    });
  } catch (error) {
    console.error('Error forgot password:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Gagal mengirim kode reset' 
    });
  }
});

// Reset Password - Verify code and set new password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, resetCode, newPassword } = req.body;

    // Validasi input
    if (!email || !resetCode || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Semua field harus diisi!' 
      });
    }

    // Validasi password length
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password minimal 6 karakter!' 
      });
    }

    // Cek reset code
    const storedData = resetCodes.get(email);

    if (!storedData) {
      return res.status(400).json({ 
        success: false, 
        message: 'Kode reset tidak valid atau sudah kadaluarsa!' 
      });
    }

    // Cek apakah code sudah expired
    if (Date.now() > storedData.expiry) {
      resetCodes.delete(email);
      return res.status(400).json({ 
        success: false, 
        message: 'Kode reset sudah kadaluarsa!' 
      });
    }

    // Verifikasi code
    if (storedData.code !== resetCode) {
      return res.status(400).json({ 
        success: false, 
        message: 'Kode reset tidak valid!' 
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password di database
    await pool.query(
      'UPDATE users SET password = ? WHERE email = ?',
      [hashedPassword, email]
    );

    // Hapus reset code setelah digunakan
    resetCodes.delete(email);

    res.json({
      success: true,
      message: 'Password berhasil direset! Silakan login dengan password baru.'
    });
  } catch (error) {
    console.error('Error reset password:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Gagal mereset password' 
    });
  }
});

export default router;
