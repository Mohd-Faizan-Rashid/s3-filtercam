const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const captureBtn = document.getElementById('captureBtn');
const filterSelect = document.getElementById('filterSelect');
const cameraSelect = document.getElementById('cameraSelect');
const ipCamUrl = document.getElementById('ipCamUrl');
const connectBtn = document.getElementById('connectBtn');
const startCameraBtn = document.getElementById('startCameraBtn');
const stopCameraBtn = document.getElementById('stopCameraBtn');
const ctx = canvas.getContext('2d');

let currentStream = null;
let isStreamActive = false;

// Handle camera selection
cameraSelect.addEventListener('change', () => {
    const selectedCamera = cameraSelect.value;
    if (selectedCamera === 'ipcam') {
        ipCamUrl.classList.remove('hidden');
        connectBtn.classList.remove('hidden');
    } else {
        ipCamUrl.classList.add('hidden');
        connectBtn.classList.add('hidden');
    }
});

// Handle IP camera connection
connectBtn.addEventListener('click', () => {
    setupCamera('ipcam');
});

// Start camera button
startCameraBtn.addEventListener('click', () => {
    if (!isStreamActive) {
        setupCamera(cameraSelect.value);
    }
});

// Stop camera button
stopCameraBtn.addEventListener('click', () => {
    stopCamera();
});

// Access the camera
async function setupCamera(source) {
    try {
        if (currentStream) {
            stopCamera();
        }

        let stream;
        switch (source) {
            case 'device':
                stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { 
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    } 
                });
                break;
            case 'droidcam':
                // Note: This might not work as expected due to browser security restrictions
                stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        deviceId: { exact: 'http://127.0.0.1:4747/video' }
                    }
                });
                break;
            case 'ipcam':
                const url = ipCamUrl.value;
                if (!url) {
                    throw new Error('Please enter a valid IP camera URL');
                }
                video.src = url;
                await video.play();
                isStreamActive = true;
                return; // No need to set srcObject for IP camera
            default:
                throw new Error('Invalid camera source');
        }

        video.srcObject = stream;
        currentStream = stream;
        await video.play();
        isStreamActive = true;
        // Set canvas size after video is loaded
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        console.log('Camera accessed successfully');
    } catch (err) {
        console.error("Error accessing the camera:", err);
        alert(`Error accessing the camera: ${err.message}. Please ensure you've granted camera permissions and try again.`);
    }
}

function stopCamera() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
    video.srcObject = null;
    video.src = '';
    isStreamActive = false;
    console.log('Camera stopped');
}

// Apply selected filter
function applyFilter(imageData, filter) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    switch (filter) {
        case 'grayscale':
            for (let i = 0; i < data.length; i += 4) {
                const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                data[i] = avg;
                data[i + 1] = avg;
                data[i + 2] = avg;
            }
            break;
        case 'negative':
            for (let i = 0; i < data.length; i += 4) {
                data[i] = 255 - data[i];
                data[i + 1] = 255 - data[i + 1];
                data[i + 2] = 255 - data[i + 2];
            }
            break;
        case 'sharp':
            const tempData = new Uint8ClampedArray(data);
            const kernel = [
                0, -1, 0,
                -1, 5, -1,
                0, -1, 0
            ];
            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    const offset = (y * width + x) * 4;
                    for (let c = 0; c < 3; c++) {
                        let val = 0;
                        for (let ky = -1; ky <= 1; ky++) {
                            for (let kx = -1; kx <= 1; kx++) {
                                const idx = ((y + ky) * width + (x + kx)) * 4 + c;
                                val += tempData[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
                            }
                        }
                        data[offset + c] = Math.min(Math.max(val, 0), 255);
                    }
                }
            }
            break;
        default:
            // No filter
            break;
    }
    return imageData;
}

// Capture and upload image
captureBtn.addEventListener('click', () => {
    if (!isStreamActive) {
        alert('Camera is not active. Please start the camera first.');
        return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const selectedFilter = filterSelect.value;
    imageData = applyFilter(imageData, selectedFilter);
    ctx.putImageData(imageData, 0, 0);
    
    canvas.toBlob(blob => {
        const formData = new FormData();
        formData.append('image', blob, 'filtered-image.jpg');
        
        fetch('/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Image uploaded successfully:', data.url);
            alert('Image uploaded successfully!');
        })
        .catch(error => {
            console.error('Error uploading image:', error);
            alert(`Error uploading image. Please try again. Details: ${error.message}`);
        });
    }, 'image/jpeg');
});

// Apply filter in real-time
function applyRealTimeFilter() {
    if (!isStreamActive) {
        requestAnimationFrame(applyRealTimeFilter);
        return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const selectedFilter = filterSelect.value;
    imageData = applyFilter(imageData, selectedFilter);
    ctx.putImageData(imageData, 0, 0);
    
    requestAnimationFrame(applyRealTimeFilter);
}

// Initialize camera on page load
window.addEventListener('load', async () => {
    try {
        await setupCamera('device');
    } catch (err) {
        console.error("Error initializing camera:", err);
        alert(`Error initializing camera: ${err.message}. Please click 'Start Camera' to try again.`);
    }
});

// Enable real-time filter preview
applyRealTimeFilter();

