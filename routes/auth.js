import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

const router = express.Router();

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

export default router;
