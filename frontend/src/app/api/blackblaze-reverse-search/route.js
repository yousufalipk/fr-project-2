import { NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

const s3 = new S3Client({
  endpoint: 'https://s3.us-west-004.backblazeb2.com',
  region: 'us-west-004',
  credentials: {
    accessKeyId: process.env.B2_KEY_ID,
    secretAccessKey: process.env.B2_APP_KEY,
  },
});

async function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

export async function POST(req) {
  try {
    const listCommand = new ListObjectsV2Command({
      Bucket: process.env.B2_BUCKET_NAME,
    });
    const listResult = await s3.send(listCommand);

    const files = listResult.Contents || [];

    const filesWithBase64 = await Promise.all(
      files.map(async (file) => {
        const getCommand = new GetObjectCommand({
          Bucket: process.env.B2_BUCKET_NAME,
          Key: file.Key,
        });

        const getResult = await s3.send(getCommand);

        const buffer = await streamToBuffer(getResult.Body);

        const mimeType = 'image/jpeg';
        const base64Image = `data:${mimeType};base64,${buffer.toString('base64')}`;

        return {
          name: file.Key,
          link: '',
          image: base64Image,
        };
      })
    );

    return NextResponse.json(
      {
        message: 'Files fetched successfully!',
        files: filesWithBase64,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Internal Server Error:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
