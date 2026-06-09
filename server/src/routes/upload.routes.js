const { Router } = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { verifyToken } = require('../middleware/verifyToken');
const { roleGuard } = require('../middleware/roleGuard');

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max per file
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Seuls les fichiers image (jpg, png, webp, gif) sont acceptés'));
  },
});

const router = Router();

router.post(
  '/',
  verifyToken,
  roleGuard('admin'),
  upload.array('images', 5),
  (req, res) => {
    const urls = req.files.map(f => `/uploads/${f.filename}`);
    res.json({ success: true, data: { urls } });
  }
);

module.exports = router;
