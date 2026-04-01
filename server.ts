import express from 'express';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 30 * 1024 * 1024 } // 30MB limit
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API Routes
  app.post('/api/process-video', upload.single('video'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }

    const inputPath = req.file.path;
    const outputPath = path.join('uploads', `processed_${req.file.filename}.mp4`);
    const watermark = req.body.watermark || '@suamarca';
    const watermarkEnabled = req.body.watermarkEnabled === 'true';
    const opacity = req.body.opacity || '0.12';
    const motionEnabled = req.body.motionEnabled === 'true';

    // Random zoom between 1.01 and 1.03
    const zoom = (1 + (Math.floor(Math.random() * 3) + 1) / 100).toFixed(2);

    // Watermark position
    let posX = 'w-tw-20';
    let posY = 'h-th-20';
    if (motionEnabled) {
      posX = 'if(lt(mod(t,14),7),20,w-tw-20)';
      posY = 'if(lt(mod(t,28),14),h-th-20,20)';
    }

    const filterChain = [
      'fps=30000/1001',
      'scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280',
      'setsar=1',
      'eq=saturation=1.08:contrast=1.05',
      `scale=iw*${zoom}:ih*${zoom},crop=720:1280`,
      'setsar=1',
      'tpad=start_duration=0.5:start_mode=add:stop_duration=0.5:stop_mode=add:color=black'
    ];

    if (watermarkEnabled) {
      filterChain.push(`drawtext=text='${watermark}':fontcolor=white@${opacity}:fontsize=18:x=${posX}:y=${posY}:shadowcolor=black@0.05:shadowx=1:shadowy=1`);
    }

    filterChain.push('format=yuv420p');

    const filters = filterChain.join(',');

    const ffmpegArgs = [
      '-y',
      '-i', inputPath,
      '-vf', filters,
      '-map_metadata', '-1',
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '128k',
      outputPath
    ];

    const ffmpeg = spawn('ffmpeg', ffmpegArgs);

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        res.download(outputPath, `processed_${req.file!.originalname}`, (err) => {
          // Cleanup
          fs.unlinkSync(inputPath);
          if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        });
      } else {
        console.error(`FFmpeg exited with code ${code}`);
        res.status(500).json({ error: 'Video processing failed' });
        // Cleanup input
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      }
    });

    ffmpeg.stderr.on('data', (data) => {
      // Log FFmpeg progress if needed
      // console.log(`FFmpeg: ${data}`);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
