import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import FormData from 'form-data';

const MAX_RESULTS = 5;

//const FACE_SEARCH_API = process.env.FACE_SEARCH_API_1;
const FACE_SEARCH_API = process.env.FACE_SEARCH_API_2;
const TESTING_MODE = false;

async function saveBase64Image(base64Data, filename) {
  const filePath = path.join(tmpdir(), filename);
  const buffer = Buffer.from(base64Data, 'base64');
  await fs.promises.writeFile(filePath, buffer);
  return filePath;
}

export async function POST(req) {
  try {
    const data = await req.json();
    const base64Image = data?.image?.content;

    if (!base64Image) {
      return NextResponse.json({ message: 'Image content is required!' }, { status: 400 });
    }

    const base64Header = base64Image.match(/^data:image\/(\w+);base64,/);
    const extension = base64Header?.[1] || 'jpg';
    const cleanedBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');

    const tempFilename = `${uuidv4()}.${extension}`;
    const filePath = await saveBase64Image(cleanedBase64, tempFilename);

    const form = new FormData();
    form.append('images', fs.createReadStream(filePath));
    form.append('id_search', '');

    const uploadResponse = await axios.post(
      'https://facecheck.id/api/upload_pic',
      form,
      {
        headers: {
          ...form.getHeaders(),
          Authorization: FACE_SEARCH_API,
          accept: 'application/json',
        },
      }
    );

    if (uploadResponse.data?.error) {
      return NextResponse.json({ error: uploadResponse.data.error }, { status: 400 });
    }

    const id_search = uploadResponse.data.id_search;

    const json_data = {
      id_search,
      with_progress: true,
      status_only: false,
      demo: TESTING_MODE,
    };

    while (true) {
      const searchRes = await axios.post('https://facecheck.id/api/search', json_data, {
        headers: {
          Authorization: FACE_SEARCH_API,
          accept: 'application/json',
        },
      });

      const responseData = searchRes.data;

      if (responseData?.error) {
        return NextResponse.json({ error: responseData.error }, { status: 400 });
      }

      if (responseData.output) {
        const topAccounts = responseData.output.items
          .sort((a, b) => b.score - a.score)
          .slice(0, MAX_RESULTS);

        return NextResponse.json({ results: topAccounts });
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
