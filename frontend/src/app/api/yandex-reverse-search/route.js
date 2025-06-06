import { NextResponse } from 'next/server';
import fetch from 'node-fetch';
import FormData from 'form-data';

export async function POST(req) {
    try {
        const data = await req.json();
        const base64Image = data?.image?.content;

        if (!base64Image) {
            return NextResponse.json({ error: 'No image data provided' }, { status: 400 });
        }

        const base64Data = base64Image.includes('base64,') ? base64Image.split('base64,')[1] : base64Image;
        const imageBuffer = Buffer.from(base64Data, 'base64');

        const form = new FormData();
        form.append('upfile', imageBuffer, {
            filename: 'image.jpg',
            contentType: 'image/jpeg',
            knownLength: imageBuffer.length,
        });

        const params = new URLSearchParams({
            rpt: 'imageview',
            format: 'json',
            request: JSON.stringify({ blocks: [{ block: "b-page_type_search-by-image__link" }] }),
        });

        const url = `https://yandex.com/images/search?${params.toString()}`;

        const yandexResponse = await fetch(url, {
            method: 'POST',
            headers: {
                ...form.getHeaders(),
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
                Referer: 'https://yandex.com/images/',
            },
            body: form,
        });

        if (!yandexResponse.ok) {
            const errorText = await yandexResponse.text();
            console.error('Yandex API Error:', errorText);
            return NextResponse.json({ error: 'Failed to get response from Yandex' }, { status: 502 });
        }

        const jsonResponse = await yandexResponse.json();

        const queryString = jsonResponse?.blocks?.[0]?.params?.url;

        if (!queryString) {
            return NextResponse.json({ error: 'Could not extract image search URL from Yandex response' }, { status: 500 });
        }

        const imgSearchUrl = `https://yandex.com/images/search?${queryString}`;

        return NextResponse.json({ url: imgSearchUrl }, { status: 200 });
    } catch (error) {
        console.error('Internal Server Error:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
