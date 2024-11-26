import express from 'express';
import multer from 'multer';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

app.use(express.static('public'));

app.post('/upload', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileKey = `${uuidv4()}.jpg`;

    try {
        await s3Client.send(new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: fileKey,
            Body: req.file.buffer,
            ContentType: 'image/jpeg'
        }));

        const imageUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;
        res.json({ url: imageUrl });
    } catch (error) {
        console.error('Error uploading to S3:', error);
        res.status(500).json({ error: 'Error uploading image' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

