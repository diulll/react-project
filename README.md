# Backend Server - BelajarReact2

Backend API menggunakan Node.js, Express, dan MySQL.

## Setup

### 1. Install Dependencies
```bash
cd server
npm install
```

### 2. Konfigurasi Database

**Buat Database MySQL:**
```bash
# Login ke MySQL
mysql -u root -p

# Jalankan script SQL
source config/init-database.sql
```

Atau copy-paste isi file `config/init-database.sql` ke MySQL Workbench/phpMyAdmin.

### 3. Konfigurasi Environment Variables

Edit file `.env` dan sesuaikan dengan konfigurasi MySQL Anda:
```
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=belajarreact_db
JWT_SECRET=your_secret_key
```

### 4. Menjalankan Server

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

Server akan berjalan di: `http://localhost:5000`

## API Endpoints

### Authentication

#### 1. Sign Up (Register)
- **URL:** `POST /api/auth/signup`
- **Body:**
```json
{
  "fullname": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

#### 2. Log In
- **URL:** `POST /api/auth/login`
- **Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

#### 3. Get Profile (Protected)
- **URL:** `GET /api/auth/profile`
- **Headers:**
```
Authorization: Bearer <your_token>
```

## Struktur Database

### Tabel: users
- `id` - INT (Primary Key, Auto Increment)
- `fullname` - VARCHAR(255)
- `email` - VARCHAR(255) (Unique)
- `password` - VARCHAR(255) (Hashed)
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

## Testing

Gunakan Postman atau Thunder Client untuk testing API:

1. Test Sign Up
2. Test Log In - simpan token yang diterima
3. Test Profile - gunakan token di header Authorization
