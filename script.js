let video = document.getElementById('camera-feed');
let canvas = document.getElementById('overlay');
let context = canvas.getContext('2d');
let model;
let isDetecting = false;
let alertCooldown = false; // Cooldown flag for alerting

const modal = document.getElementById('modal');
const modalOkButton = document.getElementById('modal-ok');

async function loadModel() {
    model = await cocoSsd.load();
    console.log("Model loaded successfully.");
}

async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" }
        });
        video.srcObject = stream;
        video.onloadedmetadata = () => {
            video.play();
            if (!isDetecting) {
                isDetecting = true;
                detectObjects();
            }
        };
    } catch (error) {
        alert("Error accessing camera: " + error.message);
    }
}

function stopCamera() {
    const stream = video.srcObject;
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
    video.srcObject = null;
    context.clearRect(0, 0, canvas.width, canvas.height);
    isDetecting = false;
}

async function detectObjects() {
    if (!model) {
        alert("Model not loaded. Please wait.");
        return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    async function detectFrame() {
        if (!isDetecting) return;

        const predictions = await model.detect(video);
        context.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas for each frame

        predictions.forEach(prediction => {
            const [x, y, width, height] = prediction.bbox;

            // Draw bounding box
            context.strokeStyle = "#00FF00"; // Bounding box color
            context.lineWidth = 2;
            context.strokeRect(x, y, width, height);

            // Label the detected object
            context.font = "16px Arial";
            context.fillText(`${prediction.class} - ${(prediction.score * 100).toFixed(2)}%`, x, y > 10 ? y - 5 : 10);

            // Show modal if a potential camera or reflective object is detected
            if (!alertCooldown && (prediction.class === "cell phone" || prediction.class === "tv" || prediction.class === "camera")) {
                showModal();
                
                // Set cooldown to prevent immediate re-alerts
                alertCooldown = true;
                setTimeout(() => alertCooldown = false, 5000); // Reset after 5 seconds
            }
        });

        // Keep detecting with requestAnimationFrame
        requestAnimationFrame(detectFrame);
    }

    detectFrame();
}

// Show the custom modal
function showModal() {
    modal.classList.add("show");
    modal.style.display = "flex";
}

// Close the modal on clicking OK
modalOkButton.addEventListener('click', () => {
    modal.classList.remove("show");
    modal.style.display = "none";
});

document.getElementById('start-detection').addEventListener('click', async () => {
    await loadModel();
    startCamera();
});

document.getElementById('stop-detection').addEventListener('click', stopCamera);
