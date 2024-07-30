import './App.css';
import React, { useRef, useEffect, useState } from "react";
import { FaceMesh } from "@mediapipe/face_mesh";
import * as cam from "@mediapipe/camera_utils";
import Webcam from "react-webcam";

function App() {
  const [faceShape, setFaceShape] = useState("No face detected");
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  let camera = null;

  const calculateDistance = (landmark1, landmark2) => {
    const x1 = landmark1['x'];
    const y1 = landmark1['y'];
    const x2 = landmark2['x'];
    const y2 = landmark2['y'];
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  };

  const detectFaceShape = (landmarks) => {
    const jawWidth = calculateDistance(landmarks[0], landmarks[16]);
    const cheekboneWidth = calculateDistance(landmarks[2], landmarks[14]);
    const faceLength = calculateDistance(landmarks[8], landmarks[27]);
    const foreheadWidth = calculateDistance(landmarks[10], landmarks[151]);
    const jawToChinLength = calculateDistance(landmarks[152], landmarks[8]);

    // Face shape detection conditions
    if (faceLength > cheekboneWidth && cheekboneWidth > jawWidth) {
      return "Oval";
    } else if (faceLength > cheekboneWidth && cheekboneWidth < jawWidth) {
      return "Rectangle";
    } else if (foreheadWidth > cheekboneWidth && cheekboneWidth < jawWidth) {
      return "Triangle";
    } else if (jawToChinLength > foreheadWidth) {
      return "Heart";
    } else if (jawWidth === cheekboneWidth && cheekboneWidth === faceLength) {
      return "Round";
    } else if (Math.abs(jawWidth - faceLength) <= 0.1 * faceLength && Math.abs(cheekboneWidth - faceLength) <= 0.1 * faceLength) {
      return "Square";
    }
    return "Unknown";
  };

  const onResults = (results) => {
    if (!results.multiFaceLandmarks) {
      setFaceShape("No face detected");
      return;
    }

    const videoWidth = webcamRef.current.video.videoWidth;
    const videoHeight = webcamRef.current.video.videoHeight;

    canvasRef.current.width = videoWidth;
    canvasRef.current.height = videoHeight;

    const canvasElement = canvasRef.current;
    const canvasCtx = canvasElement.getContext("2d");
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    for (const landmarks of results.multiFaceLandmarks) {
      const shape = detectFaceShape(landmarks);
      setFaceShape(shape);

      for (let i = 0; i < landmarks.length; i++) {
        const x = landmarks[i].x * canvasElement.width;
        const y = landmarks[i].y * canvasElement.height;
        canvasCtx.beginPath();
        canvasCtx.arc(x, y, 1, 0, 2 * Math.PI);
        canvasCtx.fillStyle = "red";
        canvasCtx.fill();
      }
    }
    canvasCtx.restore();
  };

  useEffect(() => {
    const faceMesh = new FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    faceMesh.onResults(onResults);

    if (webcamRef.current) {
      camera = new cam.Camera(webcamRef.current.video, {
        onFrame: async () => {
          await faceMesh.send({ image: webcamRef.current.video });
        },
        width: 640,
        height: 480,
      });
      camera.start();
    }
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <center>
          <div className="App">
            <Webcam
              ref={webcamRef}
              style={{
                textAlign: "center",
                zIndex: 9,
                width: 300,
                height: "auto",
                display: 'none'
              }}
            />
            <canvas
              ref={canvasRef}
              className="output_canvas"
              style={{
                zIndex: 9,
                width: 300,
                height: "auto"
              }}
            ></canvas>
          </div>
        </center>
        <p>
          Detected face shape: <code className="App-link">{faceShape}</code>.
        </p>
      </header>
    </div>
  );
}

export default App;
