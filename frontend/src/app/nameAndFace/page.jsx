"use client";
import * as faceapi from 'face-api.js';
import React, { useState, useEffect, useRef } from 'react';
import Navbar from '@/components/Navbar';
import { Search, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

const MODEL_URL = '/models';

const NameAndFace = () => {
    const [name, setName] = useState('');
    const [image, setImage] = useState({ imageName: '', content: '' });
    const [loading, setLoading] = useState(false);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [progress, setProgress] = useState('');
    const [yandexUrl, setYandexUrl] = useState('');
    const [match, setMatch] = useState([]);
    const fileInputRef = useRef(null);

    useEffect(() => {
        const loadModels = async () => {
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            ]);
            setModelsLoaded(true);
        };
        loadModels();
    }, []);

    useEffect(() => {
        const data = JSON.parse(localStorage.getItem('unifiedSearchNameAndFace'));
        if (data) {
            setName(data.name || '');
            setImage({ imageName: data.imageName, content: data.image } || { imageName: '', content: '' });
        }
    }, []);

    const handleSearch = async (e) => {
        e.preventDefault();

        if (!name || !image.content) {
            toast.error('Please upload image and enter name.');
            return;
        }

        setLoading(true);
        setYandexUrl('');
        setMatch([]);
        setProgress('');

        try {
            const fetchJson = async (url, options, progressMsg, errorMsg) => {
                setProgress(progressMsg);
                const res = await fetch(url, options);
                const json = await res.json();
                if (!res.ok) {
                    toast.error(errorMsg);
                    throw new Error(errorMsg);
                }
                return json;
            };

            const faceSearchApiResponse = await fetchJson(
                '/api/face-search-api',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        searchQuery: name,
                        image: { content: image.content },
                    }),
                },
                'Requesting Face Search API...',
                'Error searching face API'
            );

            if (faceSearchApiResponse.results.length > 0) {
                setProgress('Comparing faces in results...');
                const res = await compareFaces(image.content, faceSearchApiResponse.results);
                if (res.status === 'success') {
                    toast.success('Face comparison successful!');
                    setMatch(
                        res.matchedImageBase64
                            ? [{ base64: res.matchedImageBase64, url: res.matchedImageUrl, distance: res.distance }]
                            : []
                    );
                    setProgress('Match found!');
                    return;
                }
            }

            setProgress('Searching BackBlaze Bucket...');
            const imageFile = base64ToFile(image.content);
            const formData = new FormData();
            formData.append('file', imageFile);

            const fastApiReqResponse = await fetchJson(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/search`,
                { method: 'POST', body: formData },
                'Searching BackBlaze Bucket...',
                'Error searching BackBlaze bucket'
            );

            if (fastApiReqResponse.match) {
                toast.success('Match found!');
                setMatch([
                    {
                        base64: fastApiReqResponse.image_base64,
                        url: fastApiReqResponse.matched_file,
                        distance: fastApiReqResponse.distance,
                    },
                ]);
                return;
            }

            const yandexReqResponse = await fetchJson(
                '/api/yandex-reverse-search',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: { content: image.content } }),
                },
                'Searching Yandex...',
                'Error searching Yandex account'
            );

            setYandexUrl(yandexReqResponse.url);
            setProgress('Yandex accounts search completed.');
        } catch (error) {
            toast.error('Internal Server Error');
        } finally {
            setLoading(false);
            setProgress('');
        }
    };

    const base64ToFile = (base64) => {
        const arr = base64.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) u8arr[n] = bstr.charCodeAt(n);
        return new File([u8arr], 'image.jpg', { type: mime });
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                setImage({
                    imageName: file.name,
                    content: reader.result,
                });
            } else {
                toast.error('Failed to read file.');
            }
        };
        reader.onerror = () => {
            toast.error('Error reading file.');
        };
        reader.readAsDataURL(file);
    };

    const removeImage = () => {
        setImage({ imageName: '', content: '' });
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="relative flex min-h-screen flex-col bg-gray-900 overflow-x-hidden">
            <div className="layout-container flex h-full grow flex-col">
                <Navbar />

                <div className="bg-gray-900/80 backdrop-blur-md border-b border-gray-800 mt-28">
                    <div className="px-4 py-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                        <h1 className="text-2xl font-bold text-gray-300">Name & Face Search</h1>
                        <p className="text-gray-400 mt-1">Search by name and facial recognition</p>
                    </div>
                </div>

                <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
                    <form onSubmit={handleSearch} className="w-full">
                        <div className="space-y-4">
                            <div className="relative">
                                <div className="flex items-center rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2 shadow-sm">
                                    <Search className="h-5 w-5 text-gray-400" />
                                    <input
                                        type="text"
                                        name="name"
                                        placeholder="Enter name to search"
                                        className="block w-full bg-transparent border-0 p-0 text-gray-200 placeholder-gray-400 focus:ring-0 sm:text-sm"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                    {name && (
                                        <button
                                            type="button"
                                            className="text-gray-400 hover:text-gray-200"
                                            onClick={() => setName('')}
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-center w-full">
                                    <label
                                        htmlFor="file-upload"
                                        className="relative flex flex-col items-center justify-center w-full h-32 border-2 border-gray-700 border-dashed rounded-lg cursor-pointer bg-gray-800/50 hover:bg-gray-800/70 transition-colors"
                                    >
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            {image.content ? (
                                                <>
                                                    <div className="relative">
                                                        <img
                                                            src={image.content}
                                                            alt="Preview"
                                                            className="h-16 w-16 object-cover rounded-md"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                removeImage();
                                                            }}
                                                            className="absolute -top-2 -right-2 bg-gray-700 rounded-full p-1 hover:bg-gray-600"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                    <p className="mt-2 text-sm text-gray-400 truncate max-w-xs px-2">
                                                        {image.imageName}
                                                    </p>
                                                </>
                                            ) : (
                                                <>
                                                    <ImageIcon className="h-8 w-8 text-gray-400" />
                                                    <p className="mt-2 text-sm text-gray-400">
                                                        <span className="font-medium">Click to upload</span> or drag and drop
                                                    </p>
                                                    <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
                                                </>
                                            )}
                                        </div>
                                        <input
                                            ref={fileInputRef}
                                            id="file-upload"
                                            name="file-upload"
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                        />
                                    </label>
                                </div>
                            </div>

                            <div>
                                <button
                                    type="submit"
                                    disabled={loading || !name || !image.content}
                                    className={`w-full flex justify-center items-center py-2 px-4 rounded-lg ${loading || !name || !image.content
                                        ? 'bg-blue-600/50 cursor-not-allowed'
                                        : 'bg-blue-600 hover:bg-blue-700'
                                        } text-white transition-colors`}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="animate-spin h-5 w-5 mr-2" />
                                            Searching...
                                        </>
                                    ) : (
                                        'Search'
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>

                <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto flex-1">
                    <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
                        <div className="px-4 py-5 sm:px-6 border-b border-gray-700">
                            <h3 className="text-lg font-medium leading-6 text-gray-300">Search Results</h3>
                        </div>
                        <div className="px-4 py-5 sm:p-6">
                            {progress && (
                                <div className="mb-4 p-3 rounded-md bg-gray-700/50 text-gray-300 text-sm flex items-center">
                                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                                    {progress}
                                </div>
                            )}

                            {match.length > 0 ? (
                                <div className="space-y-4">
                                    {match.map((item, index) => (
                                        <div key={index} className="flex items-center p-3 rounded-md bg-gray-700/30 border border-gray-700">
                                            <div className="flex-shrink-0">
                                                <img
                                                    src={item.base64}
                                                    alt="Match"
                                                    className="h-12 w-12 rounded-full object-cover border-2 border-blue-500"
                                                />
                                            </div>
                                            <div className="ml-4 flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-300 truncate">
                                                    Match found with similarity: {(1 - item.distance).toFixed(4)}
                                                </p>
                                                <p className="text-sm text-gray-400 truncate">
                                                    {item.url}
                                                </p>
                                            </div>
                                            <div className="ml-4 flex-shrink-0">
                                                <Link
                                                    href={item.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-blue-600/20 text-blue-400 hover:bg-blue-600/30"
                                                >
                                                    View
                                                </Link>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <ImageIcon className="mx-auto h-12 w-12 text-gray-500" />
                                    <h3 className="mt-2 text-sm font-medium text-gray-300">No results yet</h3>
                                    <p className="mt-1 text-sm text-gray-500">
                                        {!name && !image.content
                                            ? 'Enter a name and upload an image to search'
                                            : 'Your search results will appear here'}
                                    </p>
                                </div>
                            )}

                            {yandexUrl && (
                                <div className="mt-6 p-4 rounded-md bg-gray-700/30 border border-gray-700">
                                    <h4 className="text-sm font-medium text-gray-300 mb-2">Yandex Reverse Image Search</h4>
                                    <Link
                                        href={yandexUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center text-blue-400 hover:text-blue-300"
                                    >
                                        View on Yandex
                                        <svg className="ml-1 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                                            <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                                        </svg>
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const getFaceDescriptor = async (img) => {
    const detections = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
    return detections?.descriptor || null;
};

const compareFaces = async (userImageBase64, dataset) => {
    const userImage = await faceapi.fetchImage(userImageBase64);
    const userDescriptor = await getFaceDescriptor(userImage);

    if (!userDescriptor) return { status: 'failed', message: 'No face detected in user image' };

    let bestMatch = null;
    let minDistance = 0.3;

    for (const item of dataset) {
        const datasetImg = await faceapi.fetchImage(item.base64);
        const descriptor = await getFaceDescriptor(datasetImg);
        if (descriptor) {
            const distance = faceapi.euclideanDistance(userDescriptor, descriptor);
            if (distance < minDistance) {
                minDistance = distance;
                bestMatch = { matchedImageBase64: item.base64, matchedImageUrl: item.url, distance };
            }
        }
    }

    if (bestMatch) return { status: 'success', ...bestMatch };
    return { status: 'failed', message: 'No matching faces found' };
};

export default NameAndFace;