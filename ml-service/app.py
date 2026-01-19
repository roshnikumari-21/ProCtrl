from flask import Flask, request, jsonify
from flask_cors import CORS
from deepface import DeepFace
import os
import base64
import numpy as np
import cv2

app = Flask(__name__)
CORS(app)

def process_image(image_data):
    """
    Convert base64 string or file storage to RGB numpy array.
    """
    try:
        # Check if it's a file storage object (upload)
        if hasattr(image_data, 'read'):
            file_bytes = np.frombuffer(image_data.read(), np.uint8)
            img = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
        # Check if it's a base64 string
        elif isinstance(image_data, str):
            if ',' in image_data:
                image_data = image_data.split(',')[1]
            decoded_data = base64.b64decode(image_data)
            nparr = np.frombuffer(decoded_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        else:
            return None

        if img is None:
            return None
            
        # DeepFace expects RGB. Convert BGR to RGB.
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        return rgb_img
    except Exception as e:
        print(f"Error processing image: {e}")
        return None

@app.route('/match_faces', methods=['POST'])
def match_faces():
    try:
        # Retrieve images from request
        # Expecting 'id_image' and 'live_image' in formData or JSON
        
        id_image = None
        live_image = None

        if 'id_image' in request.files:
            id_image = process_image(request.files['id_image'])
        elif 'id_image' in request.form:
             id_image = process_image(request.form['id_image'])
        elif request.json and 'id_image' in request.json:
            id_image = process_image(request.json['id_image'])

        if 'live_image' in request.files:
            live_image = process_image(request.files['live_image'])
        elif 'live_image' in request.form:
             live_image = process_image(request.form['live_image'])
        elif request.json and 'live_image' in request.json:
            live_image = process_image(request.json['live_image'])

        if id_image is None or live_image is None:
            return jsonify({"error": "Missing or invalid images"}), 400

        # Run DeepFace Verification
        # Using Facenet512 (State of the art) and RetinaFace (Best detector)
        try:
            # We strictly enforce detection. If no face, it returns ValueError
            result = DeepFace.verify(
                img1_path = id_image,
                img2_path = live_image,
                model_name = "Facenet512",
                detector_backend = "retinaface", 
                distance_metric = "cosine",
                enforce_detection = True,
                align = True
            )
            
            # STRICTER THRESHOLD Logic
            # Default Facenet512 threshold is 0.30 (Cosine)
            # We lower it to 0.15 to minimize false accepts (imposters).
            
            strict_threshold = 0.15
            distance = result["distance"]
            
            # Override the library's decision if it's in the "grey zone" (0.15 - 0.30)
            is_match = distance <= strict_threshold
            
            warning = None
            if not is_match:
                # If valid faces are found but distance is high, it's likely a different person
                warning = "CRITICAL: Different person detected. Face does not match the ID card record."

            print(f"Match Check | Distance: {distance} | Threshold: {strict_threshold} | Match: {is_match}")
            
            return jsonify({
                "match": is_match,
                "warning": warning,
                "confidence": 1 - distance if distance < 1 else 0,
                "distance": distance,
                "threshold": strict_threshold,
                "model": "Facenet512"
            })
            
        except ValueError as ve:
             # Occurs when face is not detected
             print(f"Face detection error: {ve}")
             return jsonify({
                 "match": False,
                 "error": "Face not detected in one or both images. Please ensure proper lighting and face visibility."
             })

    except Exception as e:
        print(f"Error in match_faces: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy"}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)
