/* tslint:disable */
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import {GenerateVideosParameters, GoogleGenAI} from '@google/genai';

const GEMINI_API_KEY = process.env.API_KEY;

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function blobToBase64(blob: Blob) {
  return new Promise<string>(async (resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      resolve(url.split(',')[1]);
    };
    reader.readAsDataURL(blob);
  });
}

function downloadFile(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

async function generateContent(prompt: string, imageBytes: string) {
  const ai = new GoogleGenAI({vertexai: false, apiKey: GEMINI_API_KEY});

  const config: GenerateVideosParameters = {
    model: 'veo-3.0-fast-generate-001',
    // model: 'veo-3.0-generate-001',
    // model: 'veo-2.0-generate-001',
    prompt,
    config: {
      // aspectRatio: '16:9',
      // durationSeconds: 1,
      // fps: 24,
      // generateAudio: true,
      // resolution: "720p",
      numberOfVideos: 1,
    },
  };

  if (imageBytes) {
    config.image = {
      imageBytes,
      mimeType: 'image/png',
    };
  }

  let operation = await ai.models.generateVideos(config);

  while (!operation.done) {
    console.log('Waiting for completion');
    await delay(1000);
    operation = await ai.operations.getVideosOperation({operation});
  }

  const videos = operation.response?.generatedVideos;
  if (videos === undefined || videos.length === 0) {
    throw new Error('No videos generated');
  }

  videos.forEach(async (v, i) => {
    const url = decodeURIComponent(v.video.uri);
    const res = await fetch(url);
    const blob = await res.blob();
    const objectURL = URL.createObjectURL(blob);
    downloadFile(objectURL, `video${i}.mp4`);
    video.src = objectURL;
    console.log('Downloaded video', `video${i}.mp4`);
    video.style.display = 'block';
  });
}

const upload = document.querySelector('#file-input') as HTMLInputElement;
let base64data = '';
let prompt = '';

upload.addEventListener('change', async (e) => {
  const file = (e.target as HTMLInputElement).files[0];
  if (file) {
    base64data = await blobToBase64(file);
  }
});

const promptEl = document.querySelector('#prompt-input') as HTMLInputElement;
promptEl.addEventListener('change', async () => {
  prompt = promptEl.value;
});

const statusEl = document.querySelector('#status') as HTMLDivElement;
const video = document.querySelector('#video') as HTMLVideoElement;
const errorModal = document.querySelector('#error-modal') as HTMLDivElement;
const errorMessageContainer = document.querySelector(
  '#error-message-container',
) as HTMLDivElement;
const modalAddKeyButton = document.querySelector(
  '#modal-add-key-button',
) as HTMLButtonElement;
const modalCloseButton = document.querySelector(
  '#modal-close-button',
) as HTMLButtonElement;

modalCloseButton.addEventListener('click', () => {
  errorModal.style.display = 'none';
});

modalAddKeyButton.addEventListener('click', async () => {
  await window.aistudio?.openSelectKey();
  errorModal.style.display = 'none';
});

const generateButton = document.querySelector(
  '#generate-button',
) as HTMLButtonElement;
generateButton.addEventListener('click', (e) => {
  generate();
});

function showErrorModal(messages: string[]) {
  // Clear previous messages
  errorMessageContainer.innerHTML = '';
  // Add new messages
  messages.forEach((msg) => {
    const p = document.createElement('p');
    p.textContent = msg;
    errorMessageContainer.appendChild(p);
  });
  errorModal.style.display = 'flex';
}

async function generate() {
  statusEl.innerText = 'Generating...';
  video.style.display = 'none';

  generateButton.disabled = true;
  upload.disabled = true;
  promptEl.disabled = true;

  try {
    await generateContent(prompt, base64data);
    statusEl.innerText = 'Done.';
  } catch (e) {
    console.error('Video generation failed:', e);
    showErrorModal([
      'Veo 3 is only available on the Paid Tier.',
      'Please select your Cloud Project to get started',
    ]);
    statusEl.innerText = 'Error generating video.';
  }

  generateButton.disabled = false;
  upload.disabled = false;
  promptEl.disabled = false;
}
