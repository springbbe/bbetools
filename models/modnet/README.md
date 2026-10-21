# MODNet (portrait matting)

- File: `model_quantized.onnx` (6,6 MB, lượng tử hoá uint8)
- Nguồn: https://huggingface.co/Xenova/modnet (bản ONNX của https://github.com/ZHKKKe/MODNet)
- Giấy phép: Apache-2.0
- SHA-256: `92e49898c3e05a6d7a944fc67a8cb87c4aad754ffb6ebd949528c7d1105fee3a`
- Đầu vào `input` [1, 3, H, W] (RGB chuẩn hoá về [-1, 1], cạnh ngắn 512, H và W chia hết cho 32); đầu ra `output` [1, 1, H, W] là mặt nạ alpha 0..1.

Đặt trong repo (không tải từ HuggingFace) để công cụ chỉ phụ thuộc GitHub Pages + jsDelivr.
