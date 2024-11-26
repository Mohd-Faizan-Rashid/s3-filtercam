const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const captureBtn = document.getElementById('captureBtn');
const filterSelect = document.getElementById('filterSelect');
const ctx = canvas.getContext('2d');

// Access the camera
navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
        video.srcObject = stream;
    })
    .catch(err => {
        console.error("Error accessing the camera", err);
    });

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
        .then(response => response.json())
        .then(data => {
            console.log('Image uploaded successfully:', data.url);
            alert('Image uploaded successfully!');
        })
        .catch(error => {
            console.error('Error uploading image:', error);
            alert('Error uploading image. Please try again.');
        });
    }, 'image/jpeg');
});

// Apply filter in real-time
function applyRealTimeFilter() {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const selectedFilter = filterSelect.value;
    imageData = applyFilter(imageData, selectedFilter);
    ctx.putImageData(imageData, 0, 0);
    
    requestAnimationFrame(applyRealTimeFilter);
}

// Enable real-time filter preview
applyRealTimeFilter();

