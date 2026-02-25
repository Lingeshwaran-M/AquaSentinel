# AquaSentinel X — AI Model Training & Artifacts

This directory contains AI model training scripts and saved model artifacts.

## Directory Structure

```
ai/
├── models/              # Saved model weights (.h5, .pt)
├── training/            # Training scripts
│   ├── train_classifier.py
│   └── preprocess_data.py
├── datasets/            # Training datasets (not committed)
└── README.md
```

## Image Classification Model

### Model Architecture
- **Base**: EfficientNet-B0 (transfer learning) or ResNet50
- **Input**: 224x224x3 RGB images
- **Output**: 4 classes — construction, debris_dumping, land_filling, pollution
- **Framework**: TensorFlow 2.x or PyTorch

### Training Pipeline

1. **Data Collection**
   - Satellite imagery from Google Earth Engine
   - Citizen-uploaded images (labeled)
   - Open datasets (DeepGlobe, Building detection datasets)

2. **Preprocessing**
   - Resize to 224x224
   - Normalize pixel values to [0, 1]
   - Data augmentation (rotation, flip, brightness, crop)

3. **Training**
   ```bash
   python training/train_classifier.py \
     --data_dir ./datasets/violations \
     --model_name efficientnet_b0 \
     --epochs 50 \
     --batch_size 32 \
     --learning_rate 0.001
   ```

4. **Evaluation**
   - Accuracy, Precision, Recall, F1-Score per class
   - Confusion matrix analysis
   - Confidence calibration

5. **Export**
   - Save to `models/violation_classifier.h5`
   - Convert to ONNX for production deployment

### Current Status
The system currently uses a **heuristic classifier** (image color analysis + random scoring) as a production-ready stub. Replace with a trained model by:

```python
# In backend/ai/classifier.py, replace load_model():
import tensorflow as tf

def load_model(model_path):
    global _model
    _model = tf.keras.models.load_model(f"{model_path}/violation_classifier.h5")
    return _model
```

## Performance Benchmarks (Target)

| Metric | Target |
|--------|--------|
| Accuracy | > 90% |
| Precision | > 85% per class |
| Recall | > 85% per class |
| Inference Time | < 200ms |
| Model Size | < 50MB |
